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
  loadBackgroundImage(
    imageUrl: string,
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
    const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);
    
    // Load texture and apply scaling to match 2D orientation
    const texture = new BABYLON.Texture(imageUrl, this.scene);
    texture.uScale = -1;
    texture.vScale = -1;
    groundMaterial.diffuseTexture = texture;

    // Disable reflections by setting specular color to black
    groundMaterial.specularColor = BABYLON.Color3.Black();

    // Position ground at base level
    ground.material = groundMaterial;
    ground.position.y = 0; // Position ground at base level
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