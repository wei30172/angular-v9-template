import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import Konva from 'konva';

import { ShapeMapping, ObstacleShapeManager } from 'src/app/services/obstacle-testing/shape-service/obstacle-shape-manager';
import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { KonvaCanvasService } from 'src/app/services/obstacle-testing/konva-canvas.service';
import { KonvaEventService } from 'src/app/services/obstacle-testing/konva-event.service';
import { KeyboardEventService } from 'src/app/services/shared/keyboard-event.service';
import { TooltipService } from 'src/app/services/shared/tooltip.service';
import { Obstacle } from 'src/app/models/obstacle.model';
import { HeatmapDataService } from 'src/app/services/heatmap-testing/heatmap-data.service';
import { SimpleheatService } from 'src/app/services/heatmap-testing/simpleheat.service';

@Component({
  selector: 'app-konva-heatmap',
  templateUrl: './konva-heatmap.component.html',
  styleUrls: ['./konva-heatmap.component.scss']
})
export class KonvaHeatmapComponent implements OnInit, AfterViewInit, OnDestroy {
  // Dynamic ID for konvaHeatmapCanvas
  konvaHeatmapCanvasId: string;

  // Dynamic ID for simpleHeatCanvas
  simpleHeatCanvasId: string;

  // Constants for canvas behavior
  private readonly OBSTACLE_COUNT = 20;
  private readonly HOVER_RADIUS = 1;
  
  layers = [];

  private stage: Konva.Stage;
  private obstacleLayer: Konva.Layer;
  private heatmapLayer: Konva.Layer;
  private hoverLayer: Konva.Layer;
  private hoverTarget: Konva.Node;
  private destroy$ = new Subject<void>();

  constructor(
    private obstacleShapeManager: ObstacleShapeManager,
    private obstacleGenerationService: ObstacleGenerationService,
    private konvaCanvasService: KonvaCanvasService,
    private konvaEventService: KonvaEventService,
    private keyboardEventService: KeyboardEventService,
    private tooltipService: TooltipService,
    private heatmapDataService: HeatmapDataService,
    private simpleheatService: SimpleheatService
  ) {}

  ngOnInit() {
    // Generate a unique canvas ID with a random suffix, e.g., konvaHeatmapCanvas-abc123xyz
    this.konvaHeatmapCanvasId = `konvaHeatmapCanvas-${Math.random().toString(36).substring(2, 9)}`;
    this.simpleHeatCanvasId = `simpleHeatCanvas-${Math.random().toString(36).substring(2, 9)}`;
  }

  ngAfterViewInit() {
    // Initialize canvas and layer
    this.initializeCanvas();
    this.initHoverTarget();

    // Load the background image for the canvas
    this.konvaCanvasService.loadBackgroundImage(
      'assets/images/floorplan.jpg'
    );
    // Generate default obstacles
    this.obstacleGenerationService.generateRandomObstacles(
      this.OBSTACLE_COUNT,
      this.stage.width(),
      this.stage.height()
    );

    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToObstacles(); // Subscribe to obstacle data
    this.registerKeyboardShortcuts(); // Register keyboard shortcuts with actions
    this.generateAndRenderHeatmap(); // Render heatmap
    
    // Defer initialization until after change detection completes
    setTimeout(() => {
      this.initializeLayerList(); // Initialize layers list
    });
  }

  ngOnDestroy() {
    this.tooltipService.destroyTooltip();

    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();

    // Clear heatmap data
    this.simpleheatService.clearHeatmap();

    // Clear stage resources and events
    if (this.stage) {
      this.konvaCanvasService.clearStageAndLayers();
      this.konvaEventService.clearAllObjectEvents();
    }

    // Clear all keyboard shortcuts
    this.keyboardEventService.clearAllShortcuts();
  }

  // Initialize canvas and layer
  private initializeCanvas() {
    this.konvaCanvasService.initializeStage(this.konvaHeatmapCanvasId);
    this.stage = this.konvaCanvasService.getStage();
    this.obstacleLayer = this.konvaCanvasService.getObstacleLayer();
    this.heatmapLayer = this.konvaCanvasService.getHeatmapLayer();
    this.hoverLayer = this.konvaCanvasService.getHoverLayer();
  }

  // Initialize the hover target
  private initHoverTarget() {
    this.hoverTarget = this.konvaCanvasService.createHoverTarget()
  }

  // Initialize layers list after canvas and layers have been set up
  private initializeLayerList() {
    this.layers = [
      { name: 'obstacle', label: 'Obstacle Layer', layer: this.obstacleLayer, isTop: false },
      { name: 'heatmap', label: 'Heatmap Layer', layer: this.heatmapLayer, isTop: false },
      { name: 'hover', label: 'Heat Target', layer: this.hoverLayer, isTop: false },
    ];
    this.updateLayerStatus();
  }

  // Update the isTop state of each layer
  private updateLayerStatus() {
    this.layers.forEach(layerItem => {
      layerItem.isTop = this.konvaCanvasService.isLayerOnTop(layerItem.layer);
    });
  }

  // Check visibility of heatmapLayer
  isHeatmapLayerVisible(): boolean {
    return this.heatmapLayer ? this.heatmapLayer.visible() : false;
  }

  // Filter out layers with name 'hover'
  get filteredLayers() {
    return this.layers.filter(layer => layer.name !== 'hover');
  }

  // Subscribe to obstacle list from service
  private subscribeToObstacles() {
    this.obstacleGenerationService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(obstacles => {
        this.renderObstacles(obstacles); // Render or update obstacles on the canvas
      });
  }

  // Bind the canvas interaction events
  private bindCanvasEvents() {
    // Handle mouse leave from canvas
    this.stage.on('mouseleave', () => this.handleMouseLeave());
    // Handle zoom in/out using the mouse wheel
    this.stage.on('wheel', (event: Konva.KonvaEventObject<WheelEvent>) => this.handleMouseWheel(event));
  }

  // Listen for global keydown events
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.keyboardEventService.handleKeyDown(event);
  }

  // Register keyboard shortcuts with actions
  private registerKeyboardShortcuts() {
    this.keyboardEventService.registerShortcuts([
      { keyCombo: 'arrowup', action: () => this.moveCanvas(0, -1) },
      { keyCombo: 'arrowdown', action: () => this.moveCanvas(0, 1) },
      { keyCombo: 'arrowleft', action: () => this.moveCanvas(-1, 0) },
      { keyCombo: 'arrowright', action: () => this.moveCanvas(1, 0) },
      { keyCombo: '+', action: () => this.adjustZoom(1.1) },
      { keyCombo: '-', action: () => this.adjustZoom(1 / 1.1) },
      { keyCombo: '=', action: () => this.adjustZoom(1.1) },
      { keyCombo: '_', action: () => this.adjustZoom(1 / 1.1) },
    ]);
  }

  // Generate and render heatmap
  private generateAndRenderHeatmap() {
    // Get the canvas element by the dynamically generated ID
    const heatmapCanvas = document.getElementById(this.simpleHeatCanvasId) as unknown as HTMLCanvasElement;
    // console.log({heatmapCanvas})

    // Ensure the heatmap canvas matches the stage dimensions
    heatmapCanvas.width = this.stage.width();
    heatmapCanvas.height = this.stage.height();

    // Generate heatmap data that covers the entire stage area
    this.heatmapDataService.generateHeatmapData(
      this.stage.width(),
      this.stage.height(),
    );
    
    // Initialize Simpleheat on the heatmap canvas
    this.simpleheatService.initializeHeatmap(heatmapCanvas);
    this.simpleheatService.renderHeatmap();

    // Convert the heatmap canvas to a PNG image URL
    const heatmapImageUrl = heatmapCanvas.toDataURL('image/png');
    
    // Add the generated heatmap as a layer to the Konva stage
    this.konvaCanvasService.addHeatmapLayer(heatmapImageUrl);

    if (this.heatmapLayer) {
      this.heatmapLayer.on('mousemove', () => this.handleHeatmapHover());
    }
  }

  // Display intensity data on hover
  private handleHeatmapHover() {
    const pointerPosition = this.heatmapLayer.getRelativePointerPosition();
    if (!pointerPosition) {
      this.hoverTarget.visible(false);
      this.tooltipService.destroyTooltip();
      return;
    }
    
    const gridX = Math.floor(pointerPosition.x); 
    const gridY = Math.floor(pointerPosition.y);
    const radius = this.HOVER_RADIUS
    // console.log({gridX, gridY})

    // Update the position of hoverTarget
    this.hoverTarget.setAttrs({
      x: gridX,
      y: gridY,
      radius,
      visible: true,
    });

    // Retrieve the average intensity within the specified radius
    const averageIntensity = this.heatmapDataService.getAverageIntensityInRadius(gridX, gridY, radius) ?? 0;

    const title = `Intensity: ${averageIntensity.toFixed(2)}`;
    const description = { X: gridX, Y: gridY };

    if (averageIntensity !== null) {
      this.tooltipService.showTooltip({
        title,
        description,
        targetBounds: { x: gridX, y: gridY },
        container: this.stage.container(),
        offset: 50,
        theme: 'light'
      });
    } else {
      this.tooltipService.destroyTooltip();
    }
  }

  // Hide hover target when the mouse leaves the canvas
  private handleMouseLeave() {
    if (this.hoverTarget) {
      this.hoverTarget.visible(false);
      this.hoverLayer.batchDraw();
    }
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
    this.tooltipService.destroyTooltip();
  }

  // Render or update obstacles on the canvas based on the latest data
  private renderObstacles(obstaclesData: Obstacle[]) {
    obstaclesData.forEach(obstacleData => {
      const obstacle = this.findObstacleById(obstacleData.id);
      if (obstacle) {
        this.updateObstacleWithManager(obstacle, obstacleData);
      } else {
        this.createObstacleWithManager(obstacleData);
      }
    });
    this.obstacleLayer.batchDraw();
  }

  // Create new obstacle using ManagerService
  private createObstacleWithManager(obstacle: Obstacle) {
    // Get the manager for the obstacle type
    const manager = this.obstacleShapeManager.getShapeManagerByType(obstacle.shapeType);
    if (!manager) return;

    const newObstacle = manager.create(obstacle, false);

    this.obstacleLayer.add(newObstacle);
    this.addObstacleEventListeners(newObstacle);
  }

  // Update existing obstacle using ManagerService
  private updateObstacleWithManager(preObstacle: Konva.Shape, obstacle: Obstacle) {
    // Get the manager for the obstacle type
    const manager = this.obstacleShapeManager.getShapeManagerByType(obstacle.shapeType);
    if (!manager) return;

    // Dynamically cast preObstacle to the correct type
    const castedShape = preObstacle as ShapeMapping[typeof obstacle.shapeType]['shape'];
    manager.update(castedShape, obstacle as ShapeMapping[typeof obstacle.shapeType]['config']);
  }

  private findObstacleById<T extends Konva.Shape>(id: string): T | null {
    return this.obstacleLayer.findOne((node: Konva.Node) => {
      return node instanceof Konva.Shape && node.getAttr('id') === id;
    }) as T | null;
  }

  // Function to add event listeners to a obstacle
  private addObstacleEventListeners(obstacle: Konva.Shape) {
    this.konvaEventService.bindObjectEvents(obstacle, {
      'mouseover': () => this.handleObstacleMouseOver(obstacle),
      'mouseout': () => this.handleObstacleMouseOut(obstacle),
    });
  }

  // Mouse hovers over a obstacle, displaying the tooltip
  private handleObstacleMouseOver(obstacle: Konva.Shape) {
    // Update obstacle's stroke style
    obstacle.setAttrs({
      stroke: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 1,
    });
    this.showObstacleTooltip(obstacle);
    this.obstacleLayer.batchDraw();
  }

  // Mouse leaves a obstacle, hiding the tooltip
  private handleObstacleMouseOut(obstacle: Konva.Shape) {
    // Reset obstacle's style
    obstacle.setAttrs({
      stroke: null,
      strokeWidth: 0,
    });
  }

  // Update Tooltip position and content
  private showObstacleTooltip(obstacle: Konva.Shape) {
    this.tooltipService.destroyTooltip();
    
    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(obstacle);
    if (!result) {
      return;
    }
    
    const { manager, shape } = result;
    const shapeData = manager.copyObstacleData(shape);
    const shapeBounds = this.obstacleShapeManager.getShapeBounds(obstacle);
    
    const { x, y, ...rest } = shapeData;
    const title = `(${x.toFixed(2)}, ${y.toFixed(2)})`;

    const description = Object.entries(rest).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, unknown>);

    // Show the tooltip with calculated position and content
    this.tooltipService.showTooltip({
      title,
      description,
      targetBounds: shapeBounds,
      container: this.stage.container(),
      theme: 'custom'
    });
  }

  // Zoom in by increasing the zoom factor by 10%
  zoomIn() {
    this.adjustZoom(1.1);
  }

  // Zoom out by decreasing the zoom factor by 10%
  zoomOut() {
    this.adjustZoom(1 / 1.1);
  }

  // Reset the zoom to the default level
  resetZoom() {
    this.konvaCanvasService.resetZoom();
    this.tooltipService.destroyTooltip();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.konvaCanvasService.adjustZoom(factor);
    this.tooltipService.destroyTooltip();
  }
  
  // Move the stage up
  moveUp() {
    this.moveCanvas(0, -1);
  }

  // Move the stage down
  moveDown() {
    this.moveCanvas(0, 1);
  }

  // Move the stage left
  moveLeft() {
    this.moveCanvas(1, 0);
  }

  // Move the stage right
  moveRight() {
    this.moveCanvas(-1, 0);
  }

  // Adjust the canvas position by panning
  private moveCanvas(directionX: number, directionY: number) {
    this.konvaCanvasService.moveCanvas(directionX, directionY);
    this.tooltipService.destroyTooltip();
  }

  // Toggle grid visibility
  toggleGrid() {
    this.konvaCanvasService.toggleGridLayer();
  }

  // Check if the layer is on the top of the layer stack
  isLayerOnTop(layer: Konva.Layer): boolean {
    return this.konvaCanvasService.isLayerOnTop(layer);
  }

  // Move the layer to the top of the layer stack
  moveLayerToTop(layer: Konva.Layer) {
    this.konvaCanvasService.moveLayerToTop(layer);
    this.updateLayerStatus();
  }

  // Toggle layer visibility
  toggleLayerVisibility(layer: Konva.Layer) {
    this.tooltipService.destroyTooltip();
    this.konvaCanvasService.toggleLayerVisibility(layer);
  }  
}
