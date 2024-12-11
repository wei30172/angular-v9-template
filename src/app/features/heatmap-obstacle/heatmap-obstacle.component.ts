import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import Konva from 'konva';

import { ShapeMapping, ObstacleShapeManager } from 'src/app/services/obstacle/shape-service/obstacle-shape-manager';
import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';
import { KonvaCanvasService } from 'src/app/services/obstacle/konva-canvas.service';
import { KonvaEventService } from 'src/app/services/obstacle/konva-event.service';
import { KeyboardEventService } from 'src/app/services/shared/keyboard-event.service';
import { TooltipService } from 'src/app/services/shared/tooltip.service';
import { Obstacle } from 'src/app/models/obstacle.model';
import { HeatmapDataService } from 'src/app/services/heatmap/heatmap-data.service';
import { SimpleheatService } from 'src/app/services/heatmap/simpleheat.service';
import { HeatmapSettings } from 'src/app/config/heatmap-settings';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { CanvasSettings } from 'src/app/config/canvas-settings';
import { DropdownOption } from 'src/app/components/dropdown-selector/dropdown-selector.component';

@Component({
  selector: 'app-heatmap-obstacle',
  templateUrl: './heatmap-obstacle.component.html',
  styleUrls: ['./heatmap-obstacle.component.scss']
})
export class HeatmapObstacleComponent implements OnInit, AfterViewInit, OnDestroy {
  konvaHeatmapCanvasId: string; // Dynamic ID for the canvas that includes both obstacles and heatmap layers
  simpleHeatCanvasId: string; // Dynamic ID for the simpleHeat heatmap canvas
  
  heatmapOptions: DropdownOption<string>[] = [ // Heatmap ID options
    { label: 'Heatmap 1', value: 'heatmap1' },
    { label: 'Heatmap 2', value: 'heatmap2' },
    { label: 'Heatmap 3', value: 'heatmap3' },
  ];
  currentHeatmapId: string = 'heatmap1';
  
  heatmapHeightOptions: DropdownOption<number>[] = [ // Heatmap height options
    { label: '10', value: 10 },
    { label: '30', value: 30 },
    { label: '50', value: 50 },
  ];
  heatmapHeight: number = 10;
  
  
  heatmapImageUrl = null; // Current heatmap image URL
  layers = []; // Array of layer references
  isLayerListVisible = true; // Indicates whether the layer list UI is visible
  is3DViewVisible = false; // Indicates whether the 3D view is currently active
  
  private stage: Konva.Stage; // Konva stage for managing canvas elements
  private obstacleLayer: Konva.Layer; // Layer for rendering obstacles
  private heatmapLayer: Konva.Layer; // Layer for displaying the heatmap
  private hoverLayer: Konva.Layer; // Layer for hover effects
  private hoverTarget: Konva.Node; // The currently hovered node in the canvas
  private destroy$ = new Subject<void>(); // Manages observable unsubscriptions

  constructor(
    private obstacleShapeManager: ObstacleShapeManager,
    private obstacleGenerationService: ObstacleGenerationService,
    private konvaCanvasService: KonvaCanvasService,
    private konvaEventService: KonvaEventService,
    private keyboardEventService: KeyboardEventService,
    private tooltipService: TooltipService,
    private heatmapDataService: HeatmapDataService,
    private simpleheatService: SimpleheatService,
    private cdr: ChangeDetectorRef,
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

    // Mock background image: Load the background image for the canvas
    this.konvaCanvasService.loadBackgroundImage(CanvasSettings.BackgroundImageUrl);
    
    // Mock API: Generate random obstacles
    this.obstacleGenerationService.generateRandomObstacles(
      ObstacleSettings.DefaultObstacleCount,
      this.stage.width(),
      this.stage.height()
    );

    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToObstacles(); // Subscribe to obstacle data
    this.registerKeyboardShortcuts(); // Register keyboard shortcuts with actions
    this.loadInitialHeatmap(); // Generate and render initial heatmap
    this.initializeLayerList(); // Initialize layers list
    this.cdr.detectChanges(); // Manually notify Angular to update the view
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
    this.konvaCanvasService.initializeStage({
      containerId: this.konvaHeatmapCanvasId,
      layersConfig: {
        heatmapLayer: true,
        hoverLayer: true,
      },
    });
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
      { name: 'hover', label: 'Hover Target', layer: this.hoverLayer, isTop: false },
    ];
    this.updateLayerStatus();
  }

  // Update the isTop state of each layer
  private updateLayerStatus() {
    this.layers.forEach(layerItem => {
      layerItem.isTop = this.konvaCanvasService.isLayerOnTop(layerItem.layer);
    });
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
    // Handle mouse leave from the stage
    this.stage.on('mouseleave', () => this.handleMouseLeave());
    // Handle zoom in/out using the mouse wheel
    this.stage.on('wheel', (event: Konva.KonvaEventObject<WheelEvent>) =>
      this.handleMouseWheel(event)
    );
  }

  // Hide hover target
  private handleMouseLeave() {
    this.hoverTarget.visible(false);
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
    this.tooltipService.destroyTooltip();
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

  // Generate and render initial heatmap
  private loadInitialHeatmap() {
    // Mock API: Generate heatmap data that covers the entire stage area
    const heatmapData = this.heatmapDataService.generateHeatmapData(
      this.stage.width(),
      this.stage.height(),
    );

    // Render heat map
    this.renderHeatmap(heatmapData, true);
  }

  // Switch heat map Id
  switchHeatmapId(newHeatmapId: string) {
    this.currentHeatmapId = newHeatmapId;
    // console.log(`Switched to heatmap: ${newHeatmapId}`);

    // Mock API: Generate heatmap data that covers the entire stage area
    const newHeatmapData = this.heatmapDataService.generateHeatmapData(
      this.stage.width(),
      this.stage.height(),
    );

    // Render heat map
    this.renderHeatmap(newHeatmapData, false);
  }

  // Switch heat map height
  switchHeatmapHeight(newHeight: number) {
    this.heatmapHeight = newHeight;
    // console.log('Selected Heatmap Height:', newHeight);

    // Show 3D View
    if (this.is3DViewVisible === false) {
      this.toggle3DView();
    }
  }

  // Render heat map
  private renderHeatmap(
    heatmapData:  Map<number, Map<number, number>>,
    initialize: boolean
  ) {
    // Get the canvas element by the dynamically generated ID
    const heatmapCanvas = document.getElementById(this.simpleHeatCanvasId) as unknown as HTMLCanvasElement;

    // Ensure the heatmap canvas matches the stage dimensions
    heatmapCanvas.width = this.stage.width();
    heatmapCanvas.height = this.stage.height();

    if (initialize) {
      // Initialize the heatmap instance
      this.simpleheatService.initializeHeatmap(heatmapCanvas);
      this.heatmapLayer.on('mousemove', () => this.handleHeatmapMouseMove());
    }
    
    // Render heatmap data
    this.simpleheatService.renderHeatmap(heatmapData);

    // Convert the heatmap canvas to a PNG image URL
    this.heatmapImageUrl = heatmapCanvas.toDataURL('image/png');
    
    // Add the generated heatmap as a layer to the Konva stage
    this.konvaCanvasService.addHeatmapLayer(this.heatmapImageUrl);
  }
  
  // Display intensity data on hover
  private handleHeatmapMouseMove() {
    const pointerPosition = this.heatmapLayer.getRelativePointerPosition();
    
    if (!pointerPosition) {
      this.hoverTarget.visible(false);
      this.tooltipService.destroyTooltip();
      return;
    }
    
    const gridX = Math.floor(pointerPosition.x); 
    const gridY = Math.floor(pointerPosition.y);
    const radius = HeatmapSettings.DefaultRadius * 2

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

    this.tooltipService.showTooltip({
      title,
      targetBounds: { x: gridX, y: gridY },
      container: this.stage.container(),
      offset: 50,
      theme: 'light'
    });
  }

  // Render or update obstacles on the canvas
  private renderObstacles(obstaclesData: Obstacle[]) {
    let requiresFullLayerRedraw = false;

    obstaclesData.forEach(obstacleData => {
      const obstacle = this.findObstacleById(obstacleData.id);
      if (obstacle) {
        this.updateObstacleWithManager(obstacle, obstacleData);
        obstacle.draw();
      } else {
        this.createObstacleWithManager(obstacleData);
        requiresFullLayerRedraw = true;
      }
    });
    
    if (requiresFullLayerRedraw) {
      this.obstacleLayer.batchDraw();
    }
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

  // Display obstacle data on hover
  private handleObstacleMouseOver(obstacle: Konva.Shape) {
    // Retrieve x and y values
    const x = obstacle.getAttr('x') ?? 0;
    const y = obstacle.getAttr('y') ?? 0;

    // Update the position of hoverTarget
    this.hoverTarget.setAttrs({
      x: x,
      y: y,
      visible: true,
    });

    // Update obstacle's stroke style
    obstacle.setAttrs({
      stroke: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 1,
    });

    this.showObstacleTooltip(obstacle);
  }

  // Hide the tooltip when the mouse leaves the obstacle
  private handleObstacleMouseOut(obstacle: Konva.Shape) {
    // Hide hover target
    this.handleMouseLeave();

    // Reset obstacle's style
    obstacle.stroke(null);
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

  // Toggle Layer list visibility
  toggleLayerList() {
    this.isLayerListVisible = !this.isLayerListVisible;
    if (this.isLayerListVisible) {
      this.is3DViewVisible = false;
    }
  }
  
  // Toggle 3D View visibility
  toggle3DView() {
    this.is3DViewVisible = !this.is3DViewVisible;
    if (this.is3DViewVisible) {
      this.isLayerListVisible = false;
    }
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
    this.isLayerListVisible = true;
    this.is3DViewVisible = false;
    this.tooltipService.destroyTooltip();
    this.konvaCanvasService.toggleLayerVisibility(layer);
  }  
}