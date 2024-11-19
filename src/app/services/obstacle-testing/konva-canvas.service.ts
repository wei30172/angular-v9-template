import { Injectable } from '@angular/core';
import Konva from 'konva';

enum CanvasSettings {
  MinZoom = 0.2,
  MaxZoom = 20,
  PanOffset = 20,
  ScaleBy = 1.05,
}

@Injectable({
  providedIn: 'root',
})
export class KonvaCanvasService {
  // Store the stage and layer instance
  private stage: Konva.Stage | null = null;
  private backgroundLayer: Konva.Layer | null = null;
  private obstacleLayer: Konva.Layer | null = null;
  private heatmapLayer: Konva.Layer | null = null;
  private gridLayer: Konva.Layer | null = null;
  private transformer: Konva.Transformer | null = null;
  
  // Default constants
  private readonly DEFAULT_GRID_SIZE = 10;
  private readonly DEFAULT_WIDTH = 640;
  private readonly DEFAULT_HEIGHT = 640;

  // Initialize the stage with optional grid size, width, and height
  initializeStage(
    containerId: string,
    width: number = this.DEFAULT_WIDTH,
    height: number = this.DEFAULT_HEIGHT,
    gridSize: number = this.DEFAULT_GRID_SIZE
  ) {
    this.stage = new Konva.Stage({ container: containerId, width, height });

    // Initialize layers
    this.backgroundLayer = new Konva.Layer();
    this.obstacleLayer = new Konva.Layer();
    this.heatmapLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();

    // Add layers to the stage
    this.stage.add(this.backgroundLayer);
    this.stage.add(this.gridLayer);
    this.stage.add(this.heatmapLayer);
    this.stage.add(this.obstacleLayer);

    // Set layer order
    // backgroundLayer -> gridLayer -> heatmapLayer -> obstacleLayer
    this.gridLayer.moveToBottom();
    this.backgroundLayer.moveToBottom();
    this.heatmapLayer.moveDown();

    // Initialize obstacle layer with transparent background
    this.initializeObstacleLayer();

    // Initialize the transformer
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      resizeEnabled: true,
      anchorSize: 15,
      opacity: 0.8,
    });
    this.obstacleLayer.add(this.transformer);

    // Create grid
    this.createGridLayer(gridSize);
  }

  // Get the Konva stage instance
  getStage(): Konva.Stage | null {
    return this.stage;
  }

  // Get the background layer
  getBackgroundLayer(): Konva.Layer | null {
    return this.backgroundLayer;
  }

  // Get the obstacle layer
  getObstacleLayer(): Konva.Layer | null {
    return this.obstacleLayer;
  }

  // Get the heatmap layer
  getHeatmapLayer(): Konva.Layer | null {
    return this.heatmapLayer;
  }

  // Get the grid layer
  getGridLayer(): Konva.Layer | null {
    return this.gridLayer;
  }
  
  // Get the obstacle transformer
  getTransformer(): Konva.Transformer | null {
    return this.transformer;
  }
  
  // Load background image into background layer
  loadBackgroundImage(imageUrl: string, onLoadCallback?: () => void) {
    if (!this.stage) {
      throw new Error('Stage is not initialized. Please initialize the stage first.');
    }

    const image = new Image();
    // image.crossOrigin = 'anonymous'; // Handle cross-origin
    image.src = imageUrl;
    image.onload = () => {
      const konvaBackgroundImage = new Konva.Image({
        image: image,
        width: this.stage!.width(),
        height: this.stage!.height(),
      });
      this.backgroundLayer!.add(konvaBackgroundImage);
      this.backgroundLayer!.draw();
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    };
  }

  // Add the transparent background to the obstacle layer
  private initializeObstacleLayer() {
    const backgroundRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.stage!.width(),
      height: this.stage!.height(),
      fill: 'rgba(0, 0, 0, 0)', // Transparent fill to capture events
    });
    
    this.obstacleLayer!.add(backgroundRect);
    this.obstacleLayer!.draw();
  }

  // Create grid layer based on grid size, scale factor, and grid color
  private createGridLayer(
    gridSize: number,
    scaleFactor: number = 1,
    gridColor: string = '#ddd',
    strokeWidth: number = 0.2
  ) {
    if (!this.gridLayer) {
      throw new Error('Grid layer is not initialized.');
    }
  
    const width = this.stage.width();
    const height = this.stage.height();
    const adjustedGridSize = gridSize * scaleFactor; // Adjust grid size based on scale factor
  
    // Clear previous grid lines
    this.gridLayer.destroyChildren();
  
    // Draw vertical and horizontal grid lines
    for (let i = 0; i < width / adjustedGridSize; i++) {
      this.gridLayer.add(
        new Konva.Line({
          points: [i * adjustedGridSize, 0, i * adjustedGridSize, height],
          stroke: gridColor,
          strokeWidth,
        })
      );
    }
  
    for (let j = 0; j < height / adjustedGridSize; j++) {
      this.gridLayer.add(
        new Konva.Line({
          points: [0, j * adjustedGridSize, width, j * adjustedGridSize],
          stroke: gridColor,
          strokeWidth,
        })
      );
    }
  
    this.gridLayer.visible(false);
    this.gridLayer.draw(); // Re-render the grid layer
  }

  // Toggle layer visibility
  toggleLayerVisibility(layer: Konva.Layer) {
    layer?.visible(!layer.visible());
    layer?.draw();
    this.stage!.batchDraw();
  }

  // Toggle grid visibility
  toggleGridLayer() {
    this.toggleLayerVisibility(this.gridLayer!);
  }
  
  // Move the layer up in the layer stack
  moveLayerUp(layer: Konva.Layer) {
    layer?.moveUp();
    this.stage?.batchDraw();
  }

  // Move the layer down in the layer stack
  moveLayerDown(layer: Konva.Layer) {
    layer?.moveDown();
    this.stage?.batchDraw();
  }

  // Move the layer to the top of the layer stack
  moveLayerToTop(layer: Konva.Layer) {
    layer?.moveToTop();
    this.stage?.batchDraw();
  }
  
  // Move the layer to the bottom of the layer stack
  moveLayerToBottom(layer: Konva.Layer) {
    layer?.moveToBottom();
    this.stage?.batchDraw();
  }

  // Move the layer to a specific index in the layer stack
  moveLayerToIndex(layer: Konva.Layer, index: number) {
    const layers = this.stage?.getLayers(); // Get all layers
    if (!layer || !layers) return;

    if (index < 0 || index >= layers.length) {
      console.warn('Index is out of bounds.');
      return;
    }

    layer.setZIndex(index); // Set the layer's index in the stack
    this.stage.batchDraw();
  }
  
  // Check if the layer is on the top of the layer stack
  isLayerOnTop(layer: Konva.Layer): boolean {
    return layer?.getZIndex() === this.stage?.getLayers().length - 1;
  }

  // Check if the layer is at the bottom of the layer stack
  isLayerAtBottom(layer: Konva.Layer): boolean {
    return layer?.getZIndex() === 0;
  }

  // Adjust zoom level based on mouse wheel interaction
  adjustMouseWheelZoom(
    wheelEvent: WheelEvent,
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom,
    scaleBy: number = CanvasSettings.ScaleBy // smooths the zooming effect
  ) {
    if (!this.stage) return;

    // Get the current zoom level of the stage
    let currentZoom = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    // Calculate the zoom factor and limit the new zoom level
    const zoomFactor = wheelEvent.deltaY > 0 ? 1 / scaleBy : scaleBy;
    let newZoom = currentZoom * zoomFactor;
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

    this.stage.scale({ x: newZoom, y: newZoom });

    // Calculate new position relative to the pointer
    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / currentZoom,
      y: (pointer.y - this.stage.y()) / currentZoom,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    };

    this.stage.position(newPos);
    this.stage.batchDraw();
  }

  // Reset the zoom to the default level
  resetZoom() {
    if (!this.stage) return;

    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.stage.batchDraw();
  }

  // Adjust the zoom level
  adjustZoom(
    factor: number,
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom
  ) {
    if (!this.stage) return;

    let zoomLevel = this.stage.scaleX();
    const newZoom = zoomLevel * factor;

    // Ensure new zoom is within the defined limits
    if (newZoom > maxZoom || newZoom < minZoom) return;
    this.stage.scale({ x: newZoom, y: newZoom });
    this.stage.batchDraw();
  }

  // Move the canvas by panning
  moveCanvas(directionX: number = 1, directionY: number = 1) {
    if (!this.stage) return;

    // Apply PanOffset based on direction
    const offsetX = directionX * CanvasSettings.PanOffset;
    const offsetY = directionY * CanvasSettings.PanOffset;

    this.stage.position({
      x: this.stage.x() + offsetX,
      y: this.stage.y() + offsetY
    });
    this.stage.batchDraw();
  }

  // Get the current scale and pan state of the canvas
  getCanvasState() {
    if (!this.stage) return;
    const scale = this.stage.scaleX();
    const { x: panX, y: panY } = this.stage.position();
    return { scale, panX, panY };
  }

  // Add heatmap layer
  addHeatmapLayer(imageUrl: string) {
    if (!this.heatmapLayer) {
      throw new Error('Heatmap layer is not initialized.');
    }

    const heatmapImage = new Image();
    heatmapImage.src = imageUrl;
    heatmapImage.onload = () => {
      const konvaHeatmapImage = new Konva.Image({
        image: heatmapImage,
        width: this.stage!.width(),  // Set the width to match the stage width
        height: this.stage!.height(), // Set the height to match the stage height
        opacity: 1,
      });

      // Clear previous heatmap images
      this.heatmapLayer!.destroyChildren();
      
      // Add the heatmap image to the heatmap layer
      this.heatmapLayer!.add(konvaHeatmapImage);
      this.heatmapLayer!.draw();
    };
  }
  
  // Clear stage and layers
  clearStageAndLayers() {
    if (this.stage) {
      // Remove all event listeners
      this.stage.off();
      
      // Clear all transformer events if transformer exists
      this.transformer?.off();

      // Destroy all layers and destroy the stage
      this.stage.getLayers().forEach(layer => layer.destroy());
      this.stage.destroy();
      this.stage = null;
    }
    
    // Reset layers and visibility flags
    this.backgroundLayer = null;
    this.obstacleLayer = null;
    this.heatmapLayer = null;
    this.gridLayer = null;
    this.transformer = null;
  }
}