import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { Subscription } from 'rxjs';
import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { BabylonService } from 'src/app/services/obstacle-testing//babylon.service';
import { Obstacle } from 'src/app/models/obstacle.model';

@Component({
  selector: 'app-obstacle-3d',
  templateUrl: './obstacle-3d.component.html',
  styleUrls: ['./obstacle-3d.component.scss']
})
export class Obstacle3DComponent implements OnInit, OnDestroy {
  // Dynamic ID for babylonCanvas
  babylonCanvasId: string;

  // Constants for canvas behavior
  private readonly OBSTACLE_COUNT = 20;

  // Stores the obstacles' 3D representations
  private obstaclesMeshes = new Map<string, BABYLON.Mesh>();
  private obstacleSubscription: Subscription;

  // Define constants for scene configuration
  private readonly BACKGROUND_IMAGE_URL = 'assets/images/floorplan.jpg';
  private readonly GROUND_SIZE = 640; // Match 2D canvas size
  private readonly OBSTACLE_HEIGHT = 50; // Fixed height for all obstacles

  // Local copy of obstacles to avoid modifying the original data
  private localObstacles: Obstacle[] = [];
  
  constructor(
    private obstacleService: ObstacleGenerationService,
    private babylonService: BabylonService
  ) {}

  ngOnInit() {
    // Generate a unique canvas ID with a random suffix, e.g., babylonCanvas-abc123xyz
    this.babylonCanvasId = `babylonCanvas-${Math.random().toString(36).substring(2, 9)}`;
  }

  ngAfterViewInit() {
    // Initialize the Babylon engine and load the background image
    this.initBabylonEngine();

    // Subscribe to obstacle data to keep 3D obstacles synchronized with 2D data
    this.obstacleSubscription = this.obstacleService.obstacles$.subscribe(obstacles => {
      // Clone obstacles data to localObstacles to avoid affecting external data
      this.localObstacles = obstacles.map(obstacle => ({ ...obstacle }));
      this.updateObstaclesInScene(this.localObstacles); // Use local data to update scene
    });

    // Generate random obstacles initially
    this.obstacleService.generateRandomObstacles(
      this.OBSTACLE_COUNT,
      this.GROUND_SIZE,
      this.GROUND_SIZE
    );
  }

  ngOnDestroy() {
    // Unsubscribe from obstacle data
    this.obstacleSubscription.unsubscribe();
    
    // Dispose of Babylon engine resources
    this.babylonService.disposeEngine();
  }

  // Initialize the Babylon engine and load the background image
  private initBabylonEngine() {
    // Get the canvas element by the dynamically generated ID
    const babylonCanvas = document.getElementById(this.babylonCanvasId) as unknown as HTMLCanvasElement;
    // console.log({babylonCanvas})

    // Initialize the Babylon engine and scene
    this.babylonService.initializeEngine(babylonCanvas);

    // Load a background image as ground texture in the scene
    this.babylonService.loadBackgroundImage(this.BACKGROUND_IMAGE_URL, this.GROUND_SIZE);
  }

  // Synchronize 3D scene obstacles with the provided list
  private updateObstaclesInScene(obstacles: Obstacle[]) {
    // Retrieve the scene instance from BabylonService
    const scene = this.babylonService.getScene();
    if (!scene) return;

    // Track currently existing obstacle IDs
    const currentIds = new Set(this.obstaclesMeshes.keys());

    // Update or create each obstacle as needed
    obstacles.forEach(obstacle => {
      this.createOrUpdate3DObstacle(obstacle);
      currentIds.delete(obstacle.id); // Remove from set once processed
    });

    // Remove obstacles that are no longer in the data source
    currentIds.forEach(id => this.remove3DObstacle(id));
  }

  // Create or update a 3D obstacle based on the current data
  private createOrUpdate3DObstacle(obstacle: Obstacle) {
    const scene = this.babylonService.getScene();
    if (!scene) return;

    // Check if the obstacle already has a corresponding 3D box
    let box = this.obstaclesMeshes.get(obstacle.id);

    if (box) {
      // Update position and color if the obstacle already exists
      this.setBoxPosition(box, obstacle);
      this.updateBoxMaterial(box, obstacle.color);
    } else {
      // Create a new box with dimensions from the obstacle data
      box = BABYLON.MeshBuilder.CreateBox(`obstacle-${obstacle.id}`, {
        width: obstacle.width,
        depth: obstacle.height,
        height: this.OBSTACLE_HEIGHT,
      }, scene);

      // Set initial material and position for the new box
      this.setBoxMaterial(box, obstacle.color, scene);
      this.setBoxPosition(box, obstacle);
    
      // Save the newly created box in the map
      this.obstaclesMeshes.set(obstacle.id, box);
    }
  }

  // Set the position of the box based on obstacle data
  private setBoxPosition(box: BABYLON.Mesh, obstacle: Obstacle) {
    box.position.x = -(obstacle.x - this.GROUND_SIZE / 2 + obstacle.width / 2);
    box.position.z = -(this.GROUND_SIZE / 2 - obstacle.y - obstacle.height / 2);
    box.position.y = this.OBSTACLE_HEIGHT / 2;
  }

  // Update the color material of an existing box
  private updateBoxMaterial(box: BABYLON.Mesh, color: string) {
    (box.material as BABYLON.StandardMaterial).diffuseColor = BABYLON.Color3.FromHexString(color);
  }

  // Set the initial material and color for a new box
  private setBoxMaterial(box: BABYLON.Mesh, color: string, scene: BABYLON.Scene, transparency: number = 0.9) {
    const material = new BABYLON.StandardMaterial(`material-${box.id}`, scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    material.alpha = transparency;
    box.material = material;
  }

  // Remove a 3D obstacle from the scene and the map if it's no longer needed
  private remove3DObstacle(id: string) {
    const box = this.obstaclesMeshes.get(id);
    if (box) {
      box.dispose(); // Dispose of the mesh to free resources
      this.obstaclesMeshes.delete(id); // Remove entry from map
    }
  }
}