import { Injectable } from '@angular/core';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
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
  private gridObstaclesMap: Map<string, Obstacle[]> = new Map();  // Map for grid-based placement
  
  constructor() {}

  // Define a map of bounding box calculators based on obstacle type
  private boundingBoxCalculators: { 
      [key in ObstacleType]: (obstacle: Obstacle) => { x: number; y: number; width: number; height: number } 
  } = {
      [ObstacleType.Rectangle]: (obstacle: RectangleObstacle) => ({
        x: obstacle.x - obstacle.width / 2,
        y: obstacle.y - obstacle.height / 2,
        width: obstacle.width,
        height: obstacle.height
      }),
      [ObstacleType.Ellipse]: (obstacle: EllipseObstacle) => ({
        x: obstacle.x - obstacle.radiusX,
        y: obstacle.y - obstacle.radiusY,
        width: obstacle.radiusX * 2,
        height: obstacle.radiusY * 2
      }),
      [ObstacleType.Triangle]: (obstacle: TriangleObstacle) => ({
        x: obstacle.x - obstacle.base / 2,
        y: obstacle.y - obstacle.height / 2,
        width: obstacle.base,
        height: obstacle.height
      }),
      [ObstacleType.Trapezoid]: (obstacle: TrapezoidObstacle) => {
        const maxWidth = Math.max(obstacle.topWidth, obstacle.bottomWidth);
        return {
          x: obstacle.x - maxWidth / 2,
          y: obstacle.y - obstacle.height / 2,
          width: maxWidth,
          height: obstacle.height
        };
      }
  };

  // Checks if a new obstacle overlaps with any obstacles in relevant grids
  isOverlapping(newObstacle: Obstacle): boolean {
    const newObstacleBox = this.getBoundingBox(newObstacle);
    
    // Calculate the grid range affected by the new obstacle
    const startCol = Math.floor(newObstacleBox.x / ObstacleSettings.MaxObstacleSize);
    const endCol = Math.floor((newObstacleBox.x + newObstacleBox.width) / ObstacleSettings.MaxObstacleSize);
    const startRow = Math.floor(newObstacleBox.y / ObstacleSettings.MaxObstacleSize);
    const endRow = Math.floor((newObstacleBox.y + newObstacleBox.height) / ObstacleSettings.MaxObstacleSize);

    // Iterate through all relevant grid cells
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        const gridObstacles = this.gridObstaclesMap.get(key);

        // Skip empty or missing grid cells
        if (!gridObstacles) continue;

        // Check for overlaps with obstacles in the same grid cell
        for (const obstacle of gridObstacles) {
          if (newObstacle.id !== obstacle.id && this.checkOverlap(newObstacle, obstacle)) {
            return true; // Overlap detected
          }
        }
      }
    }

    // No overlap detected in the relevant grids
    return false;
  }

  // Calculate bounding box for each obstacle type
  private getBoundingBox = ( obstacle: Obstacle ): { x: number; y: number; width: number; height: number } => {
    // Retrieve and call the appropriate bounding box function
    const calculateBoundingBox = this.boundingBoxCalculators[obstacle.shapeType];

    if (!calculateBoundingBox) {
      console.error(`Unknown obstacle type: ${obstacle.shapeType}`);
    }

    return calculateBoundingBox(obstacle);
  }

  // General bounding box overlap check
  private checkOverlap(obs1: Obstacle, obs2: Obstacle): boolean {
    const box1 = this.getBoundingBox(obs1);
    const box2 = this.getBoundingBox(obs2);

    return (
        box1.x < box2.x + box2.width &&
        box1.x + box1.width > box2.x &&
        box1.y < box2.y + box2.height &&
        box1.y + box1.height > box2.y
    );
  }

  // Adds an obstacle to the appropriate grids in the grid map
  addObstacleToGridMap(obstacle: Obstacle): void {
    // Get bounding box for obstacle to determine affected grid cells
    const { x, y, width, height } = this.getBoundingBox(obstacle);

    const startCol = Math.floor(x / ObstacleSettings.MaxObstacleSize);
    const endCol = Math.floor((x + width) / ObstacleSettings.MaxObstacleSize);
    const startRow = Math.floor(y / ObstacleSettings.MaxObstacleSize);
    const endRow = Math.floor((y + height) / ObstacleSettings.MaxObstacleSize);

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        if (!this.gridObstaclesMap.has(key)) {
          this.gridObstaclesMap.set(key, []);
        }
        this.gridObstaclesMap.get(key)!.push(obstacle);
      }
    }
  }

  // Adjust obstacle to prevent overlapping by aligning with the nearest boundary
  adjustToBoundary(
    obstacle: Obstacle,
    obstacles: Obstacle[],
    maxIterations = ObstacleSettings.MaxIterations
  ): Obstacle {
    let iterations = 0;

    // Get bounding box for the current obstacle
    const obstacleBox = this.getBoundingBox(obstacle);
  
    while (iterations < maxIterations) {
      let adjusted = false;
  
      for (const existingObstacle of obstacles) {
        if (obstacle.id === existingObstacle.id) continue;
  
        // Get bounding box for the existing obstacle
        const existingBox = this.getBoundingBox(existingObstacle);
  
        // Check if there's any overlap
        const overlapX = obstacleBox.x < existingBox.x + existingBox.width &&
              obstacleBox.x + obstacleBox.width > existingBox.x;
        const overlapY = obstacleBox.y < existingBox.y + existingBox.height &&
              obstacleBox.y + obstacleBox.height > existingBox.y;
  
        if (overlapX && overlapY) {
          // Calculate the distance to move to resolve overlap
          const deltaXLeft = Math.abs(obstacleBox.x - (existingBox.x + existingBox.width));
          const deltaXRight = Math.abs((obstacleBox.x + obstacleBox.width) - existingBox.x);
          const deltaYTop = Math.abs(obstacleBox.y - (existingBox.y + existingBox.height));
          const deltaYBottom = Math.abs((obstacleBox.y + obstacleBox.height) - existingBox.y);
  
          // Adjust position by the smallest delta to resolve overlap
          if (deltaXLeft < deltaXRight && deltaXLeft <= deltaYTop && deltaXLeft <= deltaYBottom) {
            obstacleBox.x = existingBox.x + existingBox.width;
          } else if (deltaXRight < deltaXLeft && deltaXRight <= deltaYTop && deltaXRight <= deltaYBottom) {
            obstacleBox.x = existingBox.x - obstacleBox.width;
          } else if (deltaYTop < deltaYBottom && deltaYTop <= deltaXLeft && deltaYTop <= deltaXRight) {
            obstacleBox.y = existingBox.y + existingBox.height;
          } else if (deltaYBottom < deltaYTop && deltaYBottom <= deltaXLeft && deltaYBottom <= deltaXRight) {
            obstacleBox.y = existingBox.y - obstacleBox.height;
          }
  
          adjusted = true;
        }
      }
  
      if (!adjusted) break; // Exit loop if no adjustments were made
      iterations++;
    }
  
    // Update obstacle center point based on adjusted bounding box
    obstacle.x = obstacleBox.x + obstacleBox.width / 2;
    obstacle.y = obstacleBox.y + obstacleBox.height / 2;
  
    return obstacle;
  }
}
