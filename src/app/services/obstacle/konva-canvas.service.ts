import { Injectable } from '@angular/core';
import Konva from 'konva';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { CanvasSettings } from 'src/app/config/canvas-settings';

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
  private hoverLayer: Konva.Layer | null = null;
  private transformer: Konva.Transformer | null = null;

  // Initialize the stage with optional grid size, width, and height
  initializeStage(
    containerId: string,
    width: number = CanvasSettings.DefaultWidth,
    height: number = CanvasSettings.DefaultHeight,
    gridSize: number = CanvasSettings.DefaultGridSize
  ) {
    this.stage = new Konva.Stage({ container: containerId, width, height });

    // Initialize layers
    this.backgroundLayer = new Konva.Layer();
    this.obstacleLayer = new Konva.Layer();
    this.heatmapLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();
    this.hoverLayer = new Konva.Layer();

    // Add layers to the stage
    const layerOrder = new Map<Konva.Layer, number>([
      [this.backgroundLayer, 0],
      [this.gridLayer, 1],
      [this.heatmapLayer, 2],
      [this.obstacleLayer, 3],
      [this.hoverLayer, 4],
    ]);

    Array.from(layerOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .forEach(([layer]) => this.stage.add(layer));

    // Initialize the transformer
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      resizeEnabled: true,
      anchorSize: ObstacleSettings.Transformer.AnchorSize,
      opacity: ObstacleSettings.Transformer.Opacity,
    });
    this.obstacleLayer.add(this.transformer);

    // Create grid
    this.createGridLayer(gridSize);

    this.stage.batchDraw();
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

  // Get the hover layer
  getHoverLayer(): Konva.Layer | null {
    return this.hoverLayer;
  }
  
  // Get the obstacle transformer
  getTransformer(): Konva.Transformer | null {
    return this.transformer;
  }
  
  // Load background image into background layer
  loadBackgroundImage(imageUrl: string, onLoadCallback?: () => void) {
    if (!this.stage) {
      console.warn('Stage is not initialized. Please initialize the stage first.');
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
      this.backgroundLayer.add(konvaBackgroundImage);
      this.backgroundLayer.draw();

      // Execute callback when the image is loaded
      if (onLoadCallback) onLoadCallback();
    };
  }

  // Create grid layer based on grid size, scale factor, and grid color
  private createGridLayer(
    gridSize: number,
    scaleFactor: number = 1,
    gridColor: string = '#ddd',
    strokeWidth: number = 0.2
  ) {
    if (!this.gridLayer) {
      console.warn('Grid layer is not initialized.');
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
    this.gridLayer.draw();
  }

  // Toggle layer visibility
  toggleLayerVisibility(layer: Konva.Layer) {
    layer?.visible(!layer.visible());
    layer?.draw();
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
    
    this.constrainStagePosition(newPos, newZoom);
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
  adjustZoom (
    factor: number,
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom
  ) {
    if (!this.stage) return;

    let zoomLevel = this.stage.scaleX();
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel * factor));

    this.stage.scale({ x: newZoom, y: newZoom });
    const currentPosition = this.stage.position();
    this.constrainStagePosition(currentPosition, newZoom);
    this.stage.batchDraw();
  }

  // Move the canvas by panning
  moveCanvas(directionX: number = 1, directionY: number = 1) {
    if (!this.stage) return;

    // Apply PanOffset based on direction
    const offsetX = directionX * CanvasSettings.PanOffset;
    const offsetY = directionY * CanvasSettings.PanOffset;

    const newPosition = {
      x: this.stage.x() + offsetX,
      y: this.stage.y() + offsetY,
    };

    const currentZoom = this.stage.scaleX();
    this.constrainStagePosition(newPosition, currentZoom);
  }

  // Get the current scale and pan state of the canvas
  getCanvasState() {
    if (!this.stage) return;
    const scale = this.stage.scaleX();
    const { x: panX, y: panY } = this.stage.position();
    return { scale, panX, panY };
  }
  
  // Constrain stage position to prevent leaving empty space
  private constrainStagePosition(position: { x: number; y: number }, zoom: number) {
    if (!this.stage) return;

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    const scaledWidth = stageWidth * zoom;
    const scaledHeight = stageHeight * zoom;

    const containerWidth = this.stage.container().offsetWidth;
    const containerHeight = this.stage.container().offsetHeight;

    // Ensure the stage doesn't leave white space
    const minX = Math.min(0, containerWidth - scaledWidth);
    const maxX = 0;

    const minY = Math.min(0, containerHeight - scaledHeight);
    const maxY = 0;

    const constrainedX = Math.max(minX, Math.min(maxX, position.x));
    const constrainedY = Math.max(minY, Math.min(maxY, position.y));

    this.stage.position({ x: constrainedX, y: constrainedY });
  }

  // Add heatmap layer
  addHeatmapLayer(imageUrl: string) {
    if (!this.heatmapLayer) {
      console.warn('Heatmap layer is not initialized.');
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
  
  // Create a hover target (circle or cross) and add to hover layer
  createHoverTarget(
    type: 'circle' | 'cross' = 'cross', // Default to 'cross'
    options?: {
      radius?: number;
      color?: string;
      lineWidth?: number;
      visible?: boolean;
    }
  ): Konva.Node {
    if (!this.hoverLayer) {
      console.warn('Hover layer is not initialized.');
    }

    const {
      radius = CanvasSettings.HoverTarget.DefaultRadius,
      color = CanvasSettings.HoverTarget.DefaultColor,
      lineWidth = CanvasSettings.HoverTarget.DefaultLineWidth,
      visible = CanvasSettings.HoverTarget.DefaultVisibility,
    } = options || {};

    let hoverTarget: Konva.Group | Konva.Circle;

    if (type === 'circle') {
      // Create a circle for the hover target
      hoverTarget = new Konva.Circle({
        x: 0,
        y: 0,
        radius,
        fill: color,
        visible,
        listening: false, // Prevent event capturing
      });
    } else if (type === 'cross') {
      // Create a cross for the hover target
      const horizontalLine = new Konva.Line({
        points: [-radius, 0, radius, 0], // Horizontal line
        stroke: color,
        strokeWidth: lineWidth,
      });
      const verticalLine = new Konva.Line({
        points: [0, -radius, 0, radius], // Vertical line
        stroke: color,
        strokeWidth: lineWidth,
      });

      hoverTarget = new Konva.Group({
        x: 0,
        y: 0,
        visible,
        listening: false, // Prevent event capturing
      });

      hoverTarget.add(horizontalLine);
      hoverTarget.add(verticalLine);
    } else {
      return // Invalid hover target type. Use "circle" or "cross".
    }

    // Add the hover target to the hover layer
    this.hoverLayer.add(hoverTarget);
    this.hoverLayer.draw();

    return hoverTarget;
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
    this.hoverLayer = null;
    this.transformer = null;
  }
}