import { Injectable } from '@angular/core';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Injectable({
  providedIn: 'root'
})
export class ObstacleCollisionService {
  private readonly GRID_SIZE = 120; // Grid size based on max obstacle size (MAX_OBSTACLE_SIZE)
  private gridObstaclesMap: Map<string, Obstacle[]> = new Map();  // Map for grid-based placement
  
  constructor() {}

  // Checks if a new obstacle overlaps with any obstacles in relevant grids
  isOverlapping(newObstacle: Obstacle): boolean {
    const startCol = Math.floor(newObstacle.x / this.GRID_SIZE);
    const endCol = Math.floor((newObstacle.x + newObstacle.width) / this.GRID_SIZE);
    const startRow = Math.floor(newObstacle.y / this.GRID_SIZE);
    const endRow = Math.floor((newObstacle.y + newObstacle.height) / this.GRID_SIZE);

    // Check each relevant grid cell for potential overlaps
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        const gridObstacles = this.gridObstaclesMap.get(key) || [];

        for (const obstacle of gridObstacles) {
          if (
            newObstacle.id !== obstacle.id &&  // Exclude the same obstacle
            newObstacle.x < obstacle.x + obstacle.width &&
            newObstacle.x + newObstacle.width > obstacle.x &&
            newObstacle.y < obstacle.y + obstacle.height &&
            newObstacle.y + newObstacle.height > obstacle.y
          ) {
            return true; // Overlap detected
          }
        }
      }
    }
    return false; // No overlap
  }

  // Adds an obstacle to the appropriate grids in the grid map
  addObstacleToGridMap(obstacle: Obstacle): void {
    const startCol = Math.floor(obstacle.x / this.GRID_SIZE);
    const endCol = Math.floor((obstacle.x + obstacle.width) / this.GRID_SIZE);
    const startRow = Math.floor(obstacle.y / this.GRID_SIZE);
    const endRow = Math.floor((obstacle.y + obstacle.height) / this.GRID_SIZE);

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
  adjustToBoundary(obstacle: Obstacle, obstacles: Obstacle[]): Obstacle {
    for (const existingObstacle of obstacles) {
      if (obstacle.id === existingObstacle.id) continue;

      // Check if there's any overlap
      const overlapX = obstacle.x < existingObstacle.x + existingObstacle.width &&
                      obstacle.x + obstacle.width > existingObstacle.x;
      const overlapY = obstacle.y < existingObstacle.y + existingObstacle.height &&
                      obstacle.y + obstacle.height > existingObstacle.y;

      if (overlapX && overlapY) {
        // Check for closest non-overlapping position
        const deltaXLeft = Math.abs(obstacle.x - (existingObstacle.x + existingObstacle.width));
        const deltaXRight = Math.abs((obstacle.x + obstacle.width) - existingObstacle.x);
        const deltaYTop = Math.abs(obstacle.y - (existingObstacle.y + existingObstacle.height));
        const deltaYBottom = Math.abs((obstacle.y + obstacle.height) - existingObstacle.y);

        // Adjust horizontally or vertically, choosing the smallest adjustment
        if (deltaXLeft < deltaXRight && deltaXLeft <= deltaYTop && deltaXLeft <= deltaYBottom) {
          obstacle.x = existingObstacle.x + existingObstacle.width;
        } else if (deltaXRight < deltaXLeft && deltaXRight <= deltaYTop && deltaXRight <= deltaYBottom) {
          obstacle.x = existingObstacle.x - obstacle.width;
        } else if (deltaYTop < deltaYBottom && deltaYTop <= deltaXLeft && deltaYTop <= deltaXRight) {
          obstacle.y = existingObstacle.y + existingObstacle.height;
        } else if (deltaYBottom < deltaYTop && deltaYBottom <= deltaXLeft && deltaYBottom <= deltaXRight) {
          obstacle.y = existingObstacle.y - obstacle.height;
        }
      }
    }
    return obstacle;
  }
}
