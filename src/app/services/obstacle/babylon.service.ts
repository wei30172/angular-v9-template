import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { CameraSettings } from 'src/app/config/camera-settings';

@Injectable({
  providedIn: 'root',
})
export class BabylonService {
  private engine: BABYLON.Engine | null = null;
  private scene: BABYLON.Scene | null = null;
  private camera: BABYLON.ArcRotateCamera | null = null;

  // Initialize the Babylon engine and scene
  initializeEngine(canvas: HTMLCanvasElement): void {
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    // Set up camera
    this.camera = new BABYLON.ArcRotateCamera(
      "camera",
      CameraSettings.Alpha, // Horizontal rotation angle around the target
      CameraSettings.Beta, // Vertical rotation angle above the target
      CameraSettings.Distance, // Distance from the target
      new BABYLON.Vector3(
        CameraSettings.Target.x,
        CameraSettings.Target.y,
        CameraSettings.Target.z
      ), // Target position
      this.scene
    );

    // Enable camera control for user interaction
    if (CameraSettings.AttachControl) {
      this.camera.attachControl(canvas, true);
    }

    // Disable keyboard controls
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    // Add a light source
    const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), this.scene);
    light.intensity = CameraSettings.LightIntensity;

    // Start rendering loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Prevent page scrolling when using the mouse wheel on the canvas
    canvas.addEventListener('wheel', event => event.preventDefault());
  }

  // Load a background image as ground texture in the scene
  addBackgroundTextureToGround(
    backgroundImageUrl: string,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    if (!this.scene) return;

    // Create the ground and set the material with background texture
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: canvasWidth, height: canvasHeight },
      this.scene
    );

    // Create background material
    const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);
    const texture = new BABYLON.Texture(backgroundImageUrl, this.scene);
    texture.uScale = -1;
    texture.vScale = -1;
    groundMaterial.diffuseTexture = texture;

    // Disable reflections by setting specular color to black
    groundMaterial.specularColor = BABYLON.Color3.Black();

    // Set material to ground
    ground.material = groundMaterial;

    // Position ground at base level
    ground.position.y = 0; 
  }

  // Load a heatmap image as ground texture in the scene
  addHeatmapTextureToGround(
    heatmapImageUrl: string,
    canvasWidth: number,
    canvasHeight: number,
    heatmapHeight: number = 10,
  ) {
    if (!this.scene) return;
  
    // Check and remove the existing heatmap ground if it exists
    const existingGround = this.scene.getMeshByName("heatmapGround");
    if (existingGround) {
      existingGround.dispose(); 
    }

    // Create the ground and set the material with heatmap texture
    const ground = BABYLON.MeshBuilder.CreateGround(
      "heatmapGround",
      { width: canvasWidth, height: canvasHeight },
      this.scene
    );

    // Create heatmap material
    const heatmapMaterial = new BABYLON.StandardMaterial("heatmapMaterial", this.scene);
    const texture = new BABYLON.Texture(heatmapImageUrl, this.scene);
    texture.uScale = -1;
    texture.vScale = -1;
    texture.hasAlpha = true
    heatmapMaterial.diffuseTexture = texture
  
    // Configure material transparency and depth settings
    heatmapMaterial.useAlphaFromDiffuseTexture = true;
    heatmapMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

    // Disable reflections by setting specular color to black
    heatmapMaterial.specularColor = BABYLON.Color3.Black();

    // Set material to ground
    ground.material = heatmapMaterial;
  
    // Set ground position based on heatmapHeight
    ground.position.y = heatmapHeight;
  }

  // Get the Babylon scene instance
  getScene(): BABYLON.Scene | null {
    return this.scene as BABYLON.Scene;
  }

  // Dispose of the Babylon engine and scene resources
  disposeEngine(): void {
    this.engine?.dispose();
  }
}