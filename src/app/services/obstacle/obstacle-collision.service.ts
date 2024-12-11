import { Injectable } from '@angular/core';
import * as SAT from 'sat';
import Konva from 'konva';
import { KonvaCanvasService } from 'src/app/services/obstacle/konva-canvas.service';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { CanvasSettings } from 'src/app/config/canvas-settings';
import {
  Obstacle,
  ObstacleType,
  RectangleObstacle,
  EllipseObstacle,
  TrapezoidObstacle,
  TriangleObstacle
} from 'src/app/models/obstacle.model';

@Injectable({
  providedIn: 'root'
})
export class ObstacleCollisionService {
  private debugLayer: Konva.Layer | null = null; // Layer used for drawing collision outlines
  private satShapeLine: Konva.Line | null = null; // A line object representing the drawn SAT polygon
  private gridObstaclesMap: Map<string, Obstacle[]> = new Map(); // A map that stores obstacles indexed by grid cell keys
  
  constructor(private konvaCanvasService: KonvaCanvasService) {}

  // Define a map of SAT shape generators based on obstacle type
  private satShapeGenerators: { 
    [key in ObstacleType]: (obstacle: Obstacle) => SAT.Polygon
  } = {
    [ObstacleType.Rectangle]: (obstacle: RectangleObstacle) => {
      const halfWidth = obstacle.width / 2;
      const halfHeight = obstacle.height / 2;
      const rectVertices = [
        new SAT.Vector(-halfWidth, -halfHeight),
        new SAT.Vector(halfWidth, -halfHeight),
        new SAT.Vector(halfWidth, halfHeight),
        new SAT.Vector(-halfWidth, halfHeight),
      ];
  
      return this.createRotatedPolygon(obstacle, rectVertices);
    },
    [ObstacleType.Ellipse]: (obstacle: EllipseObstacle) => {
      // Approximate ellipse with a polygon
      const vertices = this.generateEllipseVertices(
        obstacle.radiusX,
        obstacle.radiusY,
        32
      );
  
      return this.createRotatedPolygon(obstacle, vertices);
    },
    [ObstacleType.Triangle]: (obstacle: TriangleObstacle) => {
      const triVertices = [
        new SAT.Vector(-obstacle.base / 2, obstacle.height / 2),
        new SAT.Vector(obstacle.base / 2, obstacle.height / 2),
        new SAT.Vector(0, -obstacle.height / 2),
      ];
      
      return this.createRotatedPolygon(obstacle, triVertices);
    },
    [ObstacleType.Trapezoid]: (obstacle: TrapezoidObstacle) => {
      const halfTopWidth = obstacle.topWidth / 2;
      const halfBottomWidth = obstacle.bottomWidth / 2;
      const trapVertices = [
        new SAT.Vector(-halfBottomWidth, obstacle.height / 2),
        new SAT.Vector(halfBottomWidth, obstacle.height / 2),
        new SAT.Vector(halfTopWidth, -obstacle.height / 2),
        new SAT.Vector(-halfTopWidth, -obstacle.height / 2),
      ];
      
      return this.createRotatedPolygon(obstacle, trapVertices);
    }
  };

  // Generates a set of vertices approximating an ellipse
  private generateEllipseVertices(
    radiusX: number,
    radiusY: number,
    segments: number
  ): SAT.Vector[] {
    const vertices: SAT.Vector[] = [];
    const angleStep = (Math.PI * 2) / segments; // Step size for each segment
  
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;
  
      vertices.push(new SAT.Vector(x, y));
    }
  
    return vertices;
  }

  // Applying rotation
  private createRotatedPolygon(obstacle: Obstacle, vertices: SAT.Vector[]): SAT.Polygon {
    const angle = obstacle.rotation ? (obstacle.rotation * Math.PI) / 180 : 0; // Convert to radians

    const rotatedVertices = vertices.map(vertex => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = vertex.x;
      const y = vertex.y;

      // Apply rotation
      return new SAT.Vector(
        x * cos - y * sin,
        x * sin + y * cos
      );
    });

    return new SAT.Polygon(new SAT.Vector(obstacle.x, obstacle.y), rotatedVertices);
  }
  
  // Creates a SAT.Polygon for a given obstacle type
  private createSatShape(obstacle: Obstacle): SAT.Polygon {
    const generator = this.satShapeGenerators[obstacle.shapeType];
    if (!generator) {
      console.warn(`Unsupported obstacle type: ${obstacle.shapeType}`);
      return null;
    }
    return generator(obstacle);
  }

  // Using SAT to check collision between two obstacles
  private satOverlapCheck(obs1: Obstacle, obs2: Obstacle): boolean {
    const shape1 = this.createSatShape(obs1);
    const shape2 = this.createSatShape(obs2);

    if (!shape1 || !shape2) return false;

    const response = new SAT.Response();
    let collided = false;

    // If both are polygons
    if (shape1 instanceof SAT.Polygon && shape2 instanceof SAT.Polygon) {
      collided = SAT.testPolygonPolygon(shape1, shape2, response);
    }
    
    return collided;
  }

  // Checks if a obstacle overlaps with any obstacles or exceeds canvas boundaries
  checkOverlapAndBounds(
    newObstacle: Obstacle,
    canvasWidth = CanvasSettings.DefaultWidth,
    canvasHeight = CanvasSettings.DefaultHeight,
  ): boolean {
    // Generate SAT shape for the obstacle
    const satShape = this.createSatShape(newObstacle);

    // Return as invalid if shape generation fails
    if (!satShape) {
      console.warn(`Failed to create SAT shape for obstacle: ${newObstacle.id}`);
      return true; // Treat as invalid placement
    }

    // Draw the SAT shape for debugging purposes
    this.debugLayer = this.konvaCanvasService.getDebugLayer();
    if (this.debugLayer && satShape) {
      this.satShapeLine = this.drawSatShape(this.debugLayer, satShape) as Konva.Line;
    }

    // Calculate the rotated bounding box
    const { x, y, width, height } = this.calculateRotatedBoundingBox(satShape);

    // Check if the rotated bounding box exceeds canvas boundaries
    if (
      x < 0 || 
      y < 0 || 
      x + width > canvasWidth || 
      y + height > canvasHeight
    ) {
      // Mark as out of bounds
      if (this.debugLayer && this.satShapeLine) {
        this.satShapeLine.setAttrs({ stroke: 'yellow' });
      }
      return true; // Invalid placement
    }

    // Calculate grid range for the rotated bounding box
    const { startCol, endCol, startRow, endRow } = this.calculateGridRange(x, y, width, height);

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        const gridObstacles = this.gridObstaclesMap.get(key);

        // Skip empty or missing grid cells
        if (!gridObstacles) continue;

         // Use SAT to check overlap with each obstacle in the same grid cell
        for (const obstacle of gridObstacles) {
          if (newObstacle.id !== obstacle.id && this.satOverlapCheck(newObstacle, obstacle)) {
            return true; // Collision detected
          }
        }
      }
    }

    // No collision or boundary issue detected
    if (this.debugLayer && this.satShapeLine) {
      // Mark as valid
      this.satShapeLine.setAttrs({ stroke: 'blue' });
    }
    return false;
  }

  // Calculate the rotated bounding box for a given SAT shape
  private calculateRotatedBoundingBox(shape: SAT.Polygon): { x: number; y: number; width: number; height: number } {
    const points = shape.calcPoints.map(point => {
      return {
        x: point.x + shape.pos.x,
        y: point.y + shape.pos.y,
      };
    });

    // Find min and max for x and y
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // Add an obstacle to the respective grid cells in the map, considering rotation
  addObstacleToGridMap(newObstacle: Obstacle): void {
    // Generate the SAT shape for the obstacle
    const satShape = this.createSatShape(newObstacle);

    // If shape generation fails
    if (!satShape) {
      console.warn(`Failed to create SAT shape for obstacle: ${newObstacle.id}`);
    }

    // Calculate the rotated bounding box
    const { x, y, width, height } = this.calculateRotatedBoundingBox(satShape);

    // Calculate grid range for the rotated bounding box
    const { startCol, endCol, startRow, endRow } = this.calculateGridRange(x, y, width, height);

    // Add the obstacle to all relevant grid cells
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        if (!this.gridObstaclesMap.has(key)) {
          this.gridObstaclesMap.set(key, []);
        }
        this.gridObstaclesMap.get(key)!.push(newObstacle);
      }
    }
  }

  // Calculate grid range for a given bounding box
  private calculateGridRange(
    x: number, y: number, width: number, height: number
  ): {
    startCol: number; endCol: number; startRow: number; endRow: number
  } {
    const gridSize = ObstacleSettings.MaxObstacleSize;
    return {
      startCol: Math.floor(x / gridSize),
      endCol: Math.floor((x + width) / gridSize),
      startRow: Math.floor(y / gridSize),
      endRow: Math.floor((y + height) / gridSize),
    };
  }

  // Draws a SAT shape on a given Konva layer for debugging
  drawSatShape(layer: Konva.Layer, shape: SAT.Polygon) {
    const points: number[] = [];
    shape.points.forEach((p) => {
      points.push(p.x, p.y);
    });

    const polygon = new Konva.Line({
      x: shape.pos.x,
      y: shape.pos.y,
      points,
      closed: true,
      stroke: 'red',
      strokeWidth: 1,
      offset: { x: 0, y: 0 }
    });
    layer.add(polygon);
    return polygon;
  }
}
