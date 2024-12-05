import { Injectable } from '@angular/core';
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
  private readonly GRID_SIZE = 120; // Grid size based on max obstacle size (MAX_OBSTACLE_SIZE)
  private gridObstaclesMap: Map<string, Obstacle[]> = new Map();  // Map for grid-based placement
  
  constructor() {}

  // Define a map of bounding box calculators based on obstacle type
  private boundingBoxCalculators: { 
      [key in ObstacleType]: (obstacle: Obstacle) => { x: number; y: number; width: number; height: number } 
  } = {
      [ObstacleType.Rectangle]: (obstacle: RectangleObstacle) => ({
        x: obstacle.x,
        y: obstacle.y,
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
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.base,
        height: obstacle.height
      }),
      [ObstacleType.Trapezoid]: (obstacle: TrapezoidObstacle) => {
        const maxWidth = Math.max(obstacle.topWidth, obstacle.bottomWidth);
        return {
          x: obstacle.x - maxWidth / 2,
          y: obstacle.y,
          width: maxWidth,
          height: obstacle.height
        };
      }
  };

  // Checks if a new obstacle overlaps with any obstacles in relevant grids
  isOverlapping(newObstacle: Obstacle): boolean {
    const newObstacleBox = this.getBoundingBox(newObstacle);
    
    // Calculate the grid range affected by the new obstacle
    const startCol = Math.floor(newObstacleBox.x / this.GRID_SIZE);
    const endCol = Math.floor((newObstacleBox.x + newObstacleBox.width) / this.GRID_SIZE);
    const startRow = Math.floor(newObstacleBox.y / this.GRID_SIZE);
    const endRow = Math.floor((newObstacleBox.y + newObstacleBox.height) / this.GRID_SIZE);

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

  // Check overlap based on obstacle type
  private checkOverlap(obs1: Obstacle, obs2: Obstacle): boolean {
    if (obs1.shapeType === ObstacleType.Rectangle && obs2.shapeType === ObstacleType.Rectangle) {
      return this.checkRectangleOverlap(obs1 as RectangleObstacle, obs2 as RectangleObstacle);
    } else if (obs1.shapeType === ObstacleType.Ellipse && obs2.shapeType === ObstacleType.Ellipse) {
      return this.checkEllipseOverlap(obs1 as EllipseObstacle, obs2 as EllipseObstacle);
    } else if (obs1.shapeType === ObstacleType.Triangle && obs2.shapeType === ObstacleType.Triangle) {
      return this.checkTriangleOverlap(obs1 as TriangleObstacle, obs2 as TriangleObstacle);
    } else if (obs1.shapeType === ObstacleType.Trapezoid && obs2.shapeType === ObstacleType.Trapezoid) {
      return this.checkTrapezoidOverlap(obs1 as TrapezoidObstacle, obs2 as TrapezoidObstacle);
    }
    // For different obstacle types, check overlap using bounding boxes
    return this.checkBoundingBoxOverlap(obs1, obs2);
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
  private checkBoundingBoxOverlap(obs1: Obstacle, obs2: Obstacle): boolean {
    const box1 = this.getBoundingBox(obs1);
    const box2 = this.getBoundingBox(obs2);

    return (
        box1.x < box2.x + box2.width &&
        box1.x + box1.width > box2.x &&
        box1.y < box2.y + box2.height &&
        box1.y + box1.height > box2.y
    );
  }

  // Rectangle-specific overlap check using AABB
  private checkRectangleOverlap(rect1: RectangleObstacle, rect2: RectangleObstacle): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Ellipse-specific overlap check using distance
  private checkEllipseOverlap(ellipse1: EllipseObstacle, ellipse2: EllipseObstacle): boolean {
    const dx = ellipse1.x - ellipse2.x;
    const dy = ellipse1.y - ellipse2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (ellipse1.radiusX + ellipse2.radiusX) && distance < (ellipse1.radiusY + ellipse2.radiusY);
  }

  // Triangle-specific overlap check (using bounding box approximation)
  private checkTriangleOverlap(triangle1: TriangleObstacle, triangle2: TriangleObstacle): boolean {
    return this.checkBoundingBoxOverlap(triangle1, triangle2);
  }

  // Trapezoid-specific overlap check (using bounding box approximation)
  private checkTrapezoidOverlap(trapezoid1: TrapezoidObstacle, trapezoid2: TrapezoidObstacle): boolean {
    return this.checkBoundingBoxOverlap(trapezoid1, trapezoid2);
  }

  // Adds an obstacle to the appropriate grids in the grid map
  addObstacleToGridMap(obstacle: Obstacle): void {
    // Get bounding box for obstacle to determine affected grid cells
    const { x, y, width, height } = this.getBoundingBox(obstacle);

    const startCol = Math.floor(x / this.GRID_SIZE);
    const endCol = Math.floor((x + width) / this.GRID_SIZE);
    const startRow = Math.floor(y / this.GRID_SIZE);
    const endRow = Math.floor((y + height) / this.GRID_SIZE);

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
  adjustToBoundary(obstacle: Obstacle, obstacles: Obstacle[], maxIterations = 10): Obstacle {
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

    // Update the obstacle's position based on the adjusted bounding box
    obstacle.x = obstacleBox.x;
    obstacle.y = obstacleBox.y;
    
    return obstacle;
  }
}
