import { Injectable } from '@angular/core';
import { Obstacle } from 'src/app/models/obstacle.model';
import { BehaviorSubject } from 'rxjs';
import { ObstacleCollisionService } from './obstacle-collision.service'; 

@Injectable({
  providedIn: 'root'
})
export class ObstacleGenerationService {
  private isInitialized = false;

  // Use a Map to store obstacles by their IDs
  private obstacleMap = new Map<string, Obstacle>();

  // Observable for external components to access obstacle list
  private obstaclesSubject = new BehaviorSubject<Obstacle[]>([]);
  public obstacles$ = this.obstaclesSubject.asObservable();
  
  private readonly MAX_OBSTACLE_SIZE = 120; // Maximum obstacle size
  private readonly MIN_OBSTACLE_SIZE = 20; // Minimum obstacle size
  
  constructor(
    private collisionService: ObstacleCollisionService
  ) {}

  // Updates the observable with the current obstacle list
  private updateObstaclesSubject() {
    this.obstaclesSubject.next(Array.from(this.obstacleMap.values()));
  }

  // Generate random obstacles with specified count and canvas boundaries
  generateRandomObstacles(count: number, canvasWidth: number, canvasHeight: number): void {
    if (this.isInitialized) return; // Prevent re-generation
    this.isInitialized = true; // Mark as initialized
    
    if (count <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
      console.warn('Invalid parameters for obstacle generation');
      return;
    }
    
    while (this.obstacleMap.size < count) {
      // Generate random dimensions within specified range (between MIN_OBSTACLE_SIZE and MAX_OBSTACLE_SIZE)
      const randomWidth = Math.random() * (this.MAX_OBSTACLE_SIZE - this.MIN_OBSTACLE_SIZE) + this.MIN_OBSTACLE_SIZE;
      const randomHeight = Math.random() * (this.MAX_OBSTACLE_SIZE - this.MIN_OBSTACLE_SIZE) + this.MIN_OBSTACLE_SIZE;

      // Ensure x and y positions keep the obstacle within canvas bounds
      const randomX = Math.random() * (canvasWidth - randomWidth);
      const randomY = Math.random() * (canvasHeight - randomHeight);

      // Generate unique ID for the new obstacle, e.g., obstacle-abc123xyz
      const id = `obstacle-${Math.random().toString(36).substring(2, 9)}`;

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
      if (!this.collisionService.isOverlapping(obstacle)) {
        this.obstacleMap.set(id.toString(), obstacle); // Add non-overlapping obstacle
        this.collisionService.addObstacleToGridMap(obstacle); // Add obstacle to grid map
      }
    }
    this.updateObstaclesSubject();
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
    // const adjustedObstacle = this.collisionService.adjustToBoundary(obstacle, this.getCurrentObstacles());
    // this.obstacleMap.set(adjustedObstacle.id, adjustedObstacle);
    // this.updateObstaclesSubject();
  }

  // Update an existing obstacle's properties
  updateObstacle(id: string, updatedProps: Partial<Obstacle>): void {
    const obstacle = this.obstacleMap.get(id);
    if (obstacle) {
      this.obstacleMap.set(id, { ...obstacle, ...updatedProps });
      this.updateObstaclesSubject();
    }
    // const obstacle = this.obstacleMap.get(id);
    // if (obstacle) {
    //   const updatedObstacle = this.collisionService.adjustToBoundary({ ...obstacle, ...updatedProps }, this.getCurrentObstacles());
    //   this.obstacleMap.set(id, updatedObstacle);
    //   this.updateObstaclesSubject();
    // }
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
