import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ObstacleCollisionService } from './obstacle-collision.service'; 
import { Obstacle, ObstacleType } from 'src/app/models/obstacle.model';

export enum ObstacleSettings {
  MinDrag = 5,
  MoveOffset = 10,
  DefaultZHeight = 50,
  DefaultSpaceHeight = 350,
}

@Injectable({
  providedIn: 'root'
})
export class ObstacleGenerationService {
  private isInitialized = false;

  // Use a Map to store obstacles by their IDs
  private obstacleMap = new Map<string, Obstacle>();

  // Observable for external components to access obstacle data
  private obstaclesSubject = new BehaviorSubject<Obstacle[]>([]);
  public obstacles$ = this.obstaclesSubject.asObservable();
  private obstacleUpdatesSubject = new BehaviorSubject<Obstacle | null>(null);
  public obstacleUpdates$ = this.obstacleUpdatesSubject.asObservable();

  private readonly MAX_OBSTACLE_SIZE = 120; // Maximum obstacle size
  private readonly MIN_OBSTACLE_SIZE = 20; // Minimum obstacle size
  
  constructor(
    private collisionService: ObstacleCollisionService
  ) {}

  // Define a map of generators for obstacle shapes as a class property
  private obstacleGenerators: { 
    [key in ObstacleType]: (
      id: string, x: number, y: number, width: number, height: number
    ) => Obstacle 
  } = {
      [ObstacleType.Rectangle]: (id, x, y, width, height) => ({
          id,
          x,
          y,
          width: parseFloat(width.toFixed(2)),
          height: parseFloat(height.toFixed(2)),
          color: this.getRandomColor(),
          rotation: 0,
          // rotation: Math.random() * 360,
          zHeight: ObstacleSettings.DefaultZHeight,
          startHeight: 0,
          shapeType: ObstacleType.Rectangle
      }),
      [ObstacleType.Ellipse]: (id, x, y, width, height) => ({
          id,
          x,
          y,
          radiusX: parseFloat((width / 2).toFixed(2)),
          radiusY: parseFloat((height / 2).toFixed(2)),
          color: this.getRandomColor(),
          rotation: 0,
          // rotation: Math.random() * 360,
          zHeight: ObstacleSettings.DefaultZHeight,
          startHeight: 0,
          shapeType: ObstacleType.Ellipse
      }),
      [ObstacleType.Triangle]: (id, x, y, width, height) => ({
          id,
          x,
          y,
          base: parseFloat(width.toFixed(2)),
          height: parseFloat(height.toFixed(2)),
          color: this.getRandomColor(),
          rotation: 0,
          // rotation: Math.random() * 360,
          zHeight: ObstacleSettings.DefaultZHeight,
          startHeight: 0,
          shapeType: ObstacleType.Triangle
      }),
      [ObstacleType.Trapezoid]: (id, x, y, width, height) => ({
          id,
          x,
          y,
          topWidth: parseFloat((width * 0.7).toFixed(2)),
          bottomWidth: parseFloat(width.toFixed(2)),
          height: parseFloat(height.toFixed(2)),
          color: this.getRandomColor(),
          rotation: 0,
          // rotation: Math.random() * 360,
          zHeight: ObstacleSettings.DefaultZHeight,
          startHeight: 0,
          shapeType: ObstacleType.Trapezoid
      })
  };

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
    
    const types = [
      ObstacleType.Rectangle,
      ObstacleType.Ellipse,
      ObstacleType.Triangle,
      ObstacleType.Trapezoid
    ];


    while (this.obstacleMap.size < count) {
      // Randomly select an obstacle type
      const shapeType = types[Math.floor(Math.random() * types.length)];

      // Generate random dimensions within specified range (between MIN_OBSTACLE_SIZE and MAX_OBSTACLE_SIZE)
      const randomWidth = Math.random() * (this.MAX_OBSTACLE_SIZE - this.MIN_OBSTACLE_SIZE) + this.MIN_OBSTACLE_SIZE;
      const randomHeight = Math.random() * (this.MAX_OBSTACLE_SIZE - this.MIN_OBSTACLE_SIZE) + this.MIN_OBSTACLE_SIZE;

      // Ensure x and y positions keep the obstacle within canvas bounds
      const randomX = Math.floor(Math.random() * (canvasWidth - randomWidth));
      const randomY = Math.floor(Math.random() * (canvasHeight - randomHeight));

      // Generate a unique ID for the new obstacle with type prefix
      const id = `${shapeType}-${Math.random().toString(36).substring(2, 9)}`;

      // Create the obstacle using the obstacleGenerators map
      const obstacle = this.obstacleGenerators[shapeType](id, randomX, randomY, randomWidth, randomHeight);

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
      const updatedObstacle = { ...obstacle, ...updatedProps };
      this.obstacleMap.set(id, updatedObstacle);
      this.obstacleUpdatesSubject.next(updatedObstacle);
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
