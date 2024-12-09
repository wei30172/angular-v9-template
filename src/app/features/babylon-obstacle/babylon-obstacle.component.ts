import { Component, Input, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import earcut from "earcut";
import * as BABYLON from 'babylonjs';

import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';
import { BabylonService } from 'src/app/services/obstacle/babylon.service';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { CanvasSettings } from 'src/app/config/canvas-settings';
import {
  Obstacle,
  ObstacleType,
  RectangleObstacle,
  EllipseObstacle,
  TriangleObstacle,
  TrapezoidObstacle
} from 'src/app/models/obstacle.model';

// Assign the earcut library to the global window object for use in 3D rendering
window.earcut = earcut;

@Component({
  selector: 'app-babylon-obstacle',
  templateUrl: './babylon-obstacle.component.html',
  styleUrls: ['./babylon-obstacle.component.scss']
})
export class BabylonObstacleComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() heatmapImageUrl: string | null = null;
  @Input() heatmapHeight: number | null = null;

  // Dynamic ID for babylonCanvas
  babylonCanvasId: string;

  // Stores the obstacles' 3D representations
  private obstaclesMeshes = new Map<string, BABYLON.Mesh>();

  // Local copy of obstacles to avoid modifying the original data
  private localObstacles: Obstacle[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private obstacleGenerationService: ObstacleGenerationService,
    private babylonService: BabylonService
  ) {}

  ngOnInit() {
    // Generate a unique canvas ID with a random suffix, e.g., babylonCanvas-abc123xyz
    this.babylonCanvasId = `babylonCanvas-${Math.random().toString(36).substring(2, 9)}`;
  }

  ngAfterViewInit() {
    // Initialize the Babylon engine and load the background image
    this.initBabylonEngine();

    // Subscribe to obstacle data
    this.subscribeToObstacles();

    // Mock API: Generate random obstacles
    this.obstacleGenerationService.generateRandomObstacles(
      ObstacleSettings.DefaultObstacleCount,
      CanvasSettings.DefaultWidth,
      CanvasSettings.DefaultHeight
    );

    if (this.heatmapImageUrl) {
      // Load a heatmap image as ground texture in the scene
      this.babylonService.addHeatmapTextureToGround(
        this.heatmapImageUrl,
        CanvasSettings.DefaultWidth,
        CanvasSettings.DefaultHeight,
        this.heatmapHeight || 10
      );
    }
  }

  ngOnDestroy() {
    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
    
    // Dispose of Babylon engine resources
    this.babylonService.disposeEngine();
  }

  // Initialize the Babylon engine and load the background image
  private initBabylonEngine() {
    // Get the canvas element by the dynamically generated ID
    const babylonCanvas = document.getElementById(this.babylonCanvasId) as unknown as HTMLCanvasElement;

    // Initialize the Babylon engine and scene
    this.babylonService.initializeEngine(babylonCanvas);

    // Mock background image: Load a background image as ground texture in the scene
    this.babylonService.addBackgroundTextureToGround(
      CanvasSettings.BackgroundImageUrl,
      CanvasSettings.DefaultWidth,
      CanvasSettings.DefaultHeight
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['heatmapImageUrl'] && this.heatmapImageUrl) {
      // Load a heatmap image as ground texture in the scene
      this.babylonService.addHeatmapTextureToGround(
        this.heatmapImageUrl,
        CanvasSettings.DefaultWidth,
        CanvasSettings.DefaultHeight,
        this.heatmapHeight || 10
      );
    }

    if (changes['heatmapHeight'] && this.heatmapHeight !== null) {
      // Update heatmap height if already rendered
      const ground = this.babylonService.getScene()?.getMeshByName("heatmapGround");
      if (ground) {
        ground.position.y = this.heatmapHeight;
      }
    }
  }
  
  // Subscribe to obstacle list from service
  private subscribeToObstacles() {
    this.obstacleGenerationService.obstacles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(obstacles => {
        // Clone obstacles data to localObstacles to avoid affecting external data
        this.localObstacles = obstacles.map(obstacle => ({ ...obstacle }));
        this.updateObstaclesInScene(this.localObstacles); // Use local data to update scene
      });
  }

  // Synchronize 3D scene obstacles
  private updateObstaclesInScene(obstacles: Obstacle[]) {
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
    let mesh = this.obstaclesMeshes.get(obstacle.id);

    if (mesh) {
      // Use obstacleUpdateMap to dynamically update the shape
      const updateFunction = this.obstacleUpdateMap[obstacle.shapeType];

      if (updateFunction) {
        updateFunction(mesh, obstacle);
      } else {
        console.warn(`Unknown obstacle type: ${obstacle.shapeType}`);
      }

      // Update position and material
      this.setBoxPosition(mesh, obstacle);
      this.updateBoxMaterial(mesh, obstacle.color);
    } else {
      // Use obstacleCreationMap to dynamically create the shape
      const createFunction = this.obstacleCreationMap[obstacle.shapeType];

      if (createFunction) {
        mesh = createFunction(obstacle, scene);
        
        // Set initial material and position for the new box
        this.setBoxPosition(mesh, obstacle);
        this.setBoxMaterial(mesh, obstacle.color, scene);

        // Set rendering group to control render order
        mesh.renderingGroupId = 1; // default is 0

        // Save the newly created box in the map
        this.obstaclesMeshes.set(obstacle.id, mesh);
      } else {
        console.warn(`Unknown obstacle type: ${obstacle.shapeType}`);
      }
    }
  }

  // Y position adjustment for each obstacle type
  private positionAdjustments = new Map<ObstacleType, (zHeight: number) => number>([
    [ObstacleType.Rectangle, (zHeight) => zHeight / 2],
    [ObstacleType.Ellipse, (zHeight) => zHeight],
    [ObstacleType.Triangle, () => 0],
    [ObstacleType.Trapezoid, () => 0],
  ]);

  // Set the position of the box based on obstacle data
  private setBoxPosition(box: BABYLON.Mesh, obstacle: Obstacle) {
    const centerX = CanvasSettings.DefaultWidth / 2;
    const centerZ = CanvasSettings.DefaultHeight / 2;

    // Get the center calculator function for the obstacle type
    const calculateCenter = this.centerCalculators[obstacle.shapeType];

    // If a calculator function is found, use it to get offset values; otherwise, set default values
    const { offsetX, offsetZ } = calculateCenter ? calculateCenter(obstacle) : { offsetX: 0, offsetZ: 0 };
    
    // Calculate position based on center offset
    box.position.x = -(obstacle.x - centerX + offsetX);
    box.position.z = -(centerZ - obstacle.y - offsetZ);

    // Adjust Y position based on zHeight and startHeight
    const zHeight = obstacle.zHeight ?? ObstacleSettings.DefaultZHeight;
    const startHeight = obstacle.startHeight ?? 0;
    const adjustment = this.positionAdjustments.get(obstacle.shapeType)?.(zHeight) ?? zHeight / 2;
    const newY = startHeight + adjustment;
    box.position.y = newY;
    
    // Set rotation if defined
    box.rotation.y = BABYLON.Tools.ToRadians(obstacle.rotation || 0);
  }

  // Update the color material of an existing box
  private updateBoxMaterial(box: BABYLON.Mesh, color: string) {
    (box.material as BABYLON.StandardMaterial).diffuseColor = BABYLON.Color3.FromHexString(color);
  }

  // Set the initial material and color for a new box
  private setBoxMaterial(
    box: BABYLON.Mesh,
    color: string,
    scene: BABYLON.Scene,
    transparency: number = ObstacleSettings.MaterialOpacity
  ) {
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

  // Define a mapping of obstacle types to their respective creation functions
  private obstacleCreationMap: {
    [key in Obstacle['shapeType']]: (obstacle: Obstacle, scene: BABYLON.Scene) => BABYLON.Mesh
  } = {
    rectangle: (obstacle, scene) => {
      const rectObstacle = obstacle as RectangleObstacle;
      const rectangleMesh = BABYLON.MeshBuilder.CreateBox(`obstacle-${rectObstacle.id}`, {
        width: rectObstacle.width,
        depth: rectObstacle.height,
        height: rectObstacle.zHeight || ObstacleSettings.DefaultZHeight,
      }, scene);
      return rectangleMesh;
    },
    ellipse: (obstacle, scene) => {
      const ellipseObstacle = obstacle as EllipseObstacle;
      const path = [];
      const tessellation = 32; // The higher the value, the smoother the shape
      for (let i = 0; i < tessellation; i++) {
        const angle = (i / tessellation) * 2 * Math.PI;
        path.push(new BABYLON.Vector3(
          Math.cos(angle) * ellipseObstacle.radiusX,
          0,
          Math.sin(angle) * ellipseObstacle.radiusY
        ));
      }
      const ellipseMesh =  BABYLON.MeshBuilder.ExtrudePolygon(`obstacle-${ellipseObstacle.id}`, {
        shape: path,
        depth: ellipseObstacle.zHeight || ObstacleSettings.DefaultZHeight,
      }, scene);
      return ellipseMesh
    },
    triangle: (obstacle, scene) => {
      const triangleObstacle = obstacle as TriangleObstacle;
      const trianglePath = [
        new BABYLON.Vector3(-triangleObstacle.base / 2, 0, 0),
        new BABYLON.Vector3(triangleObstacle.base / 2, 0, 0),
        new BABYLON.Vector3(0, 0, triangleObstacle.height)
      ];
      const triangleMesh = BABYLON.MeshBuilder.ExtrudePolygon(`obstacle-${triangleObstacle.id}`, {
        shape: trianglePath,
        depth: triangleObstacle.zHeight || ObstacleSettings.DefaultZHeight,
      }, scene);
      triangleMesh.setPivotPoint(new BABYLON.Vector3(
        0,
        0,
        triangleObstacle.height / 3
      ));
      triangleMesh.rotation.x = Math.PI;
      return triangleMesh
    },
    trapezoid: (obstacle, scene) => {
      const trapezoidObstacle = obstacle as TrapezoidObstacle;
      const trapezoidPath = [
        new BABYLON.Vector3(-trapezoidObstacle.bottomWidth / 2, 0, 0),
        new BABYLON.Vector3(trapezoidObstacle.bottomWidth / 2, 0, 0),
        new BABYLON.Vector3(trapezoidObstacle.topWidth / 2, 0, trapezoidObstacle.height),
        new BABYLON.Vector3(-trapezoidObstacle.topWidth / 2, 0, trapezoidObstacle.height)
      ];
      const trapezoidMesh = BABYLON.MeshBuilder.ExtrudePolygon(`obstacle-${trapezoidObstacle.id}`, {
        shape: trapezoidPath,
        depth: trapezoidObstacle.zHeight || ObstacleSettings.DefaultZHeight,
      }, scene);
      trapezoidMesh.setPivotPoint(new BABYLON.Vector3(
        0,
        0,
        trapezoidObstacle.height / 2
      ));
      trapezoidMesh.rotation.x = Math.PI;
      return trapezoidMesh
    },
  };

  // Define a mapping of obstacle types to their respective updating functions
  private obstacleUpdateMap: {
    [key in Obstacle['shapeType']]: (box: BABYLON.Mesh, obstacle: Obstacle) => void;
  } = {
    rectangle: (box, obstacle) => {
      const rectObstacle = obstacle as RectangleObstacle;
      const currentWidth = box.scaling.x * box.getBoundingInfo().boundingBox.extendSize.x * 2;
      const currentDepth = box.scaling.z * box.getBoundingInfo().boundingBox.extendSize.z * 2;
      const currentHeight = box.scaling.y * box.getBoundingInfo().boundingBox.extendSize.y * 2;

      const newWidth = rectObstacle.width;
      const newDepth = rectObstacle.height;
      const newHeight = rectObstacle.zHeight || ObstacleSettings.DefaultZHeight;

      if (currentWidth !== newWidth || currentDepth !== newDepth || currentHeight !== newHeight) {
        box.scaling.x = newWidth / (box.getBoundingInfo().boundingBox.extendSize.x * 2);
        box.scaling.z = newDepth / (box.getBoundingInfo().boundingBox.extendSize.z * 2);
        box.scaling.y = newHeight / (box.getBoundingInfo().boundingBox.extendSize.y * 2);
        this.setBoxPosition(box, obstacle);
      }
    },
    ellipse: (box, obstacle) => {
      const ellipseObstacle = obstacle as EllipseObstacle;
      const currentHeight = box.scaling.y * box.getBoundingInfo().boundingBox.extendSize.y * 2;
      const newHeight = ellipseObstacle.zHeight || ObstacleSettings.DefaultZHeight;

      if (currentHeight !== newHeight) {
        box.scaling.y = newHeight / (box.getBoundingInfo().boundingBox.extendSize.y * 2);
      }

      box.scaling.x = ellipseObstacle.radiusX / (box.getBoundingInfo().boundingBox.extendSize.x);
      box.scaling.z = ellipseObstacle.radiusY / (box.getBoundingInfo().boundingBox.extendSize.z);
      this.setBoxPosition(box, obstacle);
    },
    triangle: (box, obstacle) => {
      const triangleObstacle = obstacle as TriangleObstacle;
      const currentBase = box.scaling.x * box.getBoundingInfo().boundingBox.extendSize.x * 2;
      const currentHeight = box.scaling.z * box.getBoundingInfo().boundingBox.extendSize.z * 2;
      const currentDepth = box.scaling.y * box.getBoundingInfo().boundingBox.extendSize.y * 2;
      const newDepth = triangleObstacle.zHeight || ObstacleSettings.DefaultZHeight;
  
      if (currentBase !== triangleObstacle.base || currentHeight !== triangleObstacle.height || currentDepth !== newDepth) {
        box.scaling.x = triangleObstacle.base / (box.getBoundingInfo().boundingBox.extendSize.x * 2);
        box.scaling.z = triangleObstacle.height / (box.getBoundingInfo().boundingBox.extendSize.z * 2);
        box.scaling.y = newDepth / (box.getBoundingInfo().boundingBox.extendSize.y * 2);
        this.setBoxPosition(box, obstacle);
      }
    },
    trapezoid: (box, obstacle) => {
      const trapezoidObstacle = obstacle as TrapezoidObstacle;
      box.dispose();
      const scene = this.babylonService.getScene();
      if (scene) {
        const trapezoidPath = [
          new BABYLON.Vector3(-trapezoidObstacle.bottomWidth / 2, 0, 0),
          new BABYLON.Vector3(trapezoidObstacle.bottomWidth / 2, 0, 0),
          new BABYLON.Vector3(trapezoidObstacle.topWidth / 2, 0, trapezoidObstacle.height),
          new BABYLON.Vector3(-trapezoidObstacle.topWidth / 2, 0, trapezoidObstacle.height),
        ];
        const newBox = BABYLON.MeshBuilder.ExtrudePolygon(`obstacle-${trapezoidObstacle.id}`, {
          shape: trapezoidPath,
          depth: trapezoidObstacle.zHeight || ObstacleSettings.DefaultZHeight,
        }, scene);
        newBox.setPivotPoint(new BABYLON.Vector3(
          0,
          0,
          trapezoidObstacle.height / 2
        ));
        newBox.rotation.x = Math.PI;

        // Update material and save the new box in the map
        this.setBoxMaterial(newBox, trapezoidObstacle.color, scene);

        // Set rendering group to control render order
        newBox.renderingGroupId = 1;

        // Save the new box in the map
        this.obstaclesMeshes.set(obstacle.id, newBox);

        this.setBoxPosition(newBox, obstacle);
      }
    },
  };

  // Define a mapping of obstacle to calculate center offsets based on obstacle type
  private centerCalculators: { [key in Obstacle['shapeType']]: (obstacle: Obstacle) => { offsetX: number; offsetZ: number } } = {
    rectangle: () => {
      return { offsetX: 0, offsetZ: 0 };
    },
    ellipse: () => {
      return { offsetX: 0, offsetZ: 0 };
    },
    triangle: (obstacle) => {
      const triangleObstacle = obstacle as TriangleObstacle;
      return { offsetX: 0, offsetZ: -triangleObstacle.height / 6 };
    },
    trapezoid: (obstacle) => {
      const trapezoidObstacle = obstacle as TrapezoidObstacle;
      return { offsetX: 0, offsetZ: -trapezoidObstacle.height / 2 };
    },
  };
}