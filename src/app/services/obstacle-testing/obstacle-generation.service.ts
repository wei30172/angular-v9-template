import { Injectable } from '@angular/core';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ObstacleGenerationService {
  // Use a Map to store obstacles by their IDs
  private obstacleMap = new Map<string, Obstacle>();

  // Observable for external components to access obstacle list
  private obstaclesSubject = new BehaviorSubject<Obstacle[]>([]);
  public obstacles$ = this.obstaclesSubject.asObservable();
  
  private readonly MAX_OBSTACLE_SIZE = 120; // Maximum obstacle size
  private readonly MIN_OBSTACLE_SIZE = 20; // Minimum obstacle size
  private readonly GRID_SIZE = this.MAX_OBSTACLE_SIZE; // Grid size based on max obstacle size

  // Update the obstaclesSubject to emit the current obstacle list as an array
  private updateObstaclesSubject() {
    this.obstaclesSubject.next(Array.from(this.obstacleMap.values()));
  }

  // Generate random obstacles with specified count and canvas boundaries
  generateRandomObstacles(count: number, canvasWidth: number, canvasHeight: number): void {
    this.obstacleMap.clear(); // Clear existing obstacles

    if (count <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
      console.warn('Invalid parameters for obstacle generation');
      return;
    }
    
    const gridMap: Map<string, Obstacle[]> = new Map();  // Map for grid-based placement

    while (this.obstacleMap.size < count) {
      // Generate random dimensions within specified range (between MIN_OBSTACLE_SIZE and MAX_OBSTACLE_SIZE)
      const randomWidth = Math.random() * (this.MAX_OBSTACLE_SIZE - this.MIN_OBSTACLE_SIZE) + this.MIN_OBSTACLE_SIZE;
      const randomHeight = Math.random() * (this.MAX_OBSTACLE_SIZE - this.MIN_OBSTACLE_SIZE) + this.MIN_OBSTACLE_SIZE;

      // Ensure x and y positions keep the obstacle within canvas bounds
      const randomX = Math.random() * (canvasWidth - randomWidth);
      const randomY = Math.random() * (canvasHeight - randomHeight);

      // Generate a unique ID for the obstacle
      const id = Date.now() + this.obstacleMap.size;

      // Create the obstacle
      const obstacle: Obstacle = {
        id: id.toString(),
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: this.getRandomColor(),
      };

      // Check if the obstacle overlaps with any existing obstacles in relevant grids
      if (!this.isOverlappingInGrid(obstacle, gridMap)) {
        this.obstacleMap.set(id.toString(), obstacle); // Add non-overlapping obstacle
        this.addObstacleToGridMap(obstacle, gridMap); // Add obstacle to grid map
      }
    }
    this.updateObstaclesSubject();
  }

  // Checks if a new obstacle overlaps with any obstacles in relevant grids
  private isOverlappingInGrid(newObstacle: Obstacle, gridMap: Map<string, Obstacle[]>): boolean {
    const startCol = Math.floor(newObstacle.x / this.GRID_SIZE);
    const endCol = Math.floor((newObstacle.x + newObstacle.width) / this.GRID_SIZE);
    const startRow = Math.floor(newObstacle.y / this.GRID_SIZE);
    const endRow = Math.floor((newObstacle.y + newObstacle.height) / this.GRID_SIZE);

    // Check each relevant grid cell for potential overlaps
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        const gridObstacles = gridMap.get(key) || [];

        for (const obstacle of gridObstacles) {
          if (
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
  private addObstacleToGridMap(obstacle: Obstacle, gridMap: Map<string, Obstacle[]>): void {
    const startCol = Math.floor(obstacle.x / this.GRID_SIZE);
    const endCol = Math.floor((obstacle.x + obstacle.width) / this.GRID_SIZE);
    const startRow = Math.floor(obstacle.y / this.GRID_SIZE);
    const endRow = Math.floor((obstacle.y + obstacle.height) / this.GRID_SIZE);

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col}-${row}`;
        if (!gridMap.has(key)) {
          gridMap.set(key, []);
        }
        gridMap.get(key)!.push(obstacle);
      }
    }
  }

  // Returns the current list of obstacles
  getCurrentObstacles(): Obstacle[] {
    return this.obstaclesSubject.getValue();
  }

  // Get an obstacle by its ID
  getObstacleById(id: string): Obstacle | undefined {
    return this.obstacleMap.get(id);
  }

  // Add a new obstacle
  addObstacle(obstacle: Obstacle): void {
    this.obstacleMap.set(obstacle.id, obstacle);
    this.updateObstaclesSubject();
  }

  // Update an existing obstacle's properties
  updateObstacle(id: string, updatedProps: Partial<Obstacle>): void {
    const obstacle = this.obstacleMap.get(id);
    if (obstacle) {
      this.obstacleMap.set(id, { ...obstacle, ...updatedProps });
      this.updateObstaclesSubject();
    }
  }

  // Remove an obstacle by its ID
  removeObstacle(id: string): void {
    this.obstacleMap.delete(id);
    this.updateObstaclesSubject();
  }

  // Clear all obstacles
  clearObstacles(): void {
    this.obstacleMap.clear();
    this.updateObstaclesSubject();
  }

  // Generate a random color as a 6-digit hexadecimal string
  getRandomColor(): string {
    const color = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return `#${color}`;
  }
}
