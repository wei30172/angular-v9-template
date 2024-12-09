import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ObstacleCollisionService } from './obstacle-collision.service'; 
import { Obstacle, ObstacleType } from 'src/app/models/obstacle.model';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';

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
  
  // Spinner loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  constructor(private collisionService: ObstacleCollisionService) {}

  // update loading state
  setLoadingState(isLoading: boolean): void {
    this.loadingSubject.next(isLoading);
  }

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
          topWidth: parseFloat((width * ObstacleSettings.DefaultTopWidthRatio).toFixed(2)),
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

  // Create a random obstacle
  private createRandomObstacle(
    canvasWidth: number,
    canvasHeight: number
  ): Obstacle {
    // Randomly select an obstacle type
    const types = [
      ObstacleType.Rectangle,
      ObstacleType.Ellipse,
      ObstacleType.Triangle,
      ObstacleType.Trapezoid
    ];
    const shapeType = types[Math.floor(Math.random() * types.length)];

    // Generate random dimensions within the specified range
    const randomWidth =
      Math.random() *
        (ObstacleSettings.MaxObstacleSize - ObstacleSettings.MinObstacleSize) +
      ObstacleSettings.MinObstacleSize;
    const randomHeight =
      Math.random() *
        (ObstacleSettings.MaxObstacleSize - ObstacleSettings.MinObstacleSize) +
      ObstacleSettings.MinObstacleSize;

    // Calculate random center positions, ensuring the obstacle stays within canvas bounds
    const randomX =
      parseFloat((Math.random() * (canvasWidth - randomWidth) + randomWidth / 2).toFixed(2));
    const randomY =
      parseFloat((Math.random() * (canvasHeight - randomHeight) + randomHeight / 2).toFixed(2));

    // Generate a unique ID for the obstacle
    const id = `${shapeType}-${Math.random().toString(36).substring(2, 9)}`;

    // Use the appropriate generator to create the obstacle
    return this.obstacleGenerators[shapeType](
      id,
      randomX,
      randomY,
      randomWidth,
      randomHeight
    );
  };

  // Generate random obstacles with specified count, canvas boundaries, and max iterations
  generateRandomObstacles(
    count: number,
    canvasWidth: number,
    canvasHeight: number,
    maxIterations: number = ObstacleSettings.MaxIterations
  ): void {
    // Prevent re-generation if already initialized
    if (this.isInitialized) return; 
    this.isInitialized = true;

    if (count <= 0 || canvasWidth <= 0 || canvasHeight <= 0 || maxIterations <= 0) {
      console.warn('Invalid parameters for obstacle generation');
      return;
    }

    // Set loading state to true
    this.setLoadingState(true);

    // Generate obstacles with overlap checking
    while (this.obstacleMap.size < count) {
      let iterations = 0; // Reset iterations for each obstacle
      let obstacle: Obstacle;
      
      do {
        iterations++;
        obstacle = this.createRandomObstacle(canvasWidth, canvasHeight);

        // If the maximum number of iterations is exceeded, force add the obstacle
        if (iterations > maxIterations) {
          // console.log(
          //   `Max iterations ${maxIterations} reached for obstacle. Adding obstacle ${obstacle.id} regardless of overlap.`
          // );
          this.obstacleMap.set(obstacle.id, obstacle);
          this.collisionService.addObstacleToGridMap(obstacle);
          break;
        }
      } while (this.collisionService.isOverlapping(obstacle)); // Retry if overlap is detected

      // Add the obstacle if it does not overlap and within iteration limits
      if (iterations <= maxIterations && !this.collisionService.isOverlapping(obstacle)) {
        this.obstacleMap.set(obstacle.id, obstacle);
        this.collisionService.addObstacleToGridMap(obstacle);
      }
    }

    // Update observable and stop loading
    this.updateObstaclesSubject();
    this.setLoadingState(false);
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
