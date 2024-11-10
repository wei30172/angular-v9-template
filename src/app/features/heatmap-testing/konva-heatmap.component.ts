import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import Konva from 'konva';

import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { KonvaCanvasService } from 'src/app/services/obstacle-testing/konva-canvas.service';
import { KonvaEventService } from 'src/app/services/obstacle-testing/konva-event.service';
import { KeyboardEventService } from 'src/app/services/shared/keyboard-event.service';
import { TooltipService } from 'src/app/services/shared/tooltip.service';
import { HeatmapDataService } from 'src/app/services/heatmap-testing/heatmap-data.service';
import { SimpleheatService } from 'src/app/services/heatmap-testing/simpleheat.service';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Component({
  selector: 'app-konva-heatmap>',
  templateUrl: './konva-heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class KonvaHeatmapComponent implements OnInit, OnDestroy {
  @ViewChild('simpleHeatCanvas', { static: true }) simpleHeatCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Constants for canvas behavior
  private readonly OBSTACLE_COUNT = 20;
  
  layers = [];

  private stage: Konva.Stage;
  private obstacleLayer: Konva.Layer;
  private destroy$ = new Subject<void>();

  constructor(
    private obstacleService: ObstacleGenerationService,
    private konvaCanvasService: KonvaCanvasService,
    private konvaEventService: KonvaEventService,
    private keyboardEventService: KeyboardEventService,
    private tooltipService: TooltipService,
    private heatmapDataService: HeatmapDataService,
    private simpleheatService: SimpleheatService
  ) {}

  ngOnInit() {
    this.initializeCanvas(); // Initialize canvas and layer
    this.loadBackgroundImage(); // Load the background image

    this.obstacleService.generateRandomObstacles( // Generate default obstacles
      this.OBSTACLE_COUNT,
      this.stage.width(),
      this.stage.height()
    );

    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToObstacles(); // Subscribe to obstacle data
    this.registerKeyboardShortcuts(); // Register keyboard shortcuts with actions
    
    // Initialize layers list after canvas and layers have been set up
    this.layers = [
      { name: 'Obstacle Layer', layer: this.konvaCanvasService.getObstacleLayer(), isTop: false },
      { name: 'Heatmap Layer', layer: this.konvaCanvasService.getHeatmapLayer(), isTop: false }
    ];
    this.updateLayerStatus();
  }

  updateLayerStatus() {
    this.layers.forEach(layerItem => {
      layerItem.isTop = this.konvaCanvasService.isLayerOnTop(layerItem.layer);
    });
  }

  ngAfterViewInit() {
    this.renderHeatmapWithSimpleheat(); // Render heatmap
  }

  ngOnDestroy() {
    // Unsubscribe from all observables
    this.obstacleService.clearObstacles();
    this.destroy$.next();
    this.destroy$.complete();

    if (this.stage) {
      this.konvaCanvasService.clearStageAndLayers();
      this.konvaEventService.clearAllObjectEvents();
    }

    // Clear all keyboard shortcuts
    this.keyboardEventService.clearAllShortcuts();
  }

  // Initialize canvas and layer
  private initializeCanvas() {
    this.konvaCanvasService.initializeStage('KonvaHeatmapCanvas');
    this.stage = this.konvaCanvasService.getStage();
    this.obstacleLayer = this.konvaCanvasService.getObstacleLayer();
  }

  // Load the background image for the canvas
  private loadBackgroundImage() {
    this.konvaCanvasService.loadBackgroundImage(
      'assets/images/floorplan.jpg'
    );
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
  
  // Render heatmap using SimpleheatService
  private renderHeatmapWithSimpleheat() {
    const heatmapCanvas = this.simpleHeatCanvas.nativeElement;

    // Ensure the heatmap canvas matches the stage dimensions
    heatmapCanvas.width = this.stage.width();
    heatmapCanvas.height = this.stage.height();

    // Generate heatmap data that covers the entire stage area
    const heatmapData = this.heatmapDataService.generateHeatmapData(
      this.stage.width(),
      this.stage.height()
    );
    
    // Initialize Simpleheat on the heatmap canvas
    this.simpleheatService.initializeHeatmap(heatmapCanvas);

    // Format data for Simpleheat
    const formattedData = heatmapData.map((point) => [point.x, point.y, point.value] as [number, number, number]);
    
    // Render the heatmap to the canvas
    this.simpleheatService.setHeatmapData(formattedData);
    this.simpleheatService.render();

    // Convert the heatmap canvas to a PNG image URL
    const heatmapImageUrl = this.simpleHeatCanvas.nativeElement.toDataURL('image/png');
    
    // Add the generated heatmap as a layer to the Konva stage
    this.konvaCanvasService.addHeatmapLayer(heatmapImageUrl);
  }

  // Bind the canvas interaction events
  private bindCanvasEvents() {
    // Handle zoom in/out using the mouse wheel
    this.stage.on('wheel', (event: Konva.KonvaEventObject<WheelEvent>) => this.handleMouseWheel(event));
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
  
    // Adjust zoom level
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
  }

  // Subscribe to obstacle updates from the service
  private subscribeToObstacles() {
    this.obstacleService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(obstacles => {
        this.renderObstacles(obstacles); // Render or update obstacles on the canvas
      });
  }
  
  // Render or update obstacles on the canvas based on the latest data
  private renderObstacles(obstaclesData: Obstacle[]) {
    obstaclesData.forEach(obstacleData => {
      const obstacle = this.findObstacleById(obstacleData.id);
      if (obstacle) {
        this.updateObstacle(obstacle, obstacleData);
      } else {
        this.createObstacle(obstacleData);
      }
    });
    this.obstacleLayer.batchDraw();
  }

  // Create new obstacle
  private createObstacle(obstacle: Obstacle) {
    const newObstacle = new Konva.Rect({
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color,
      draggable: true,
    });
    
    newObstacle.setAttr('id', obstacle.id);
    this.obstacleLayer.add(newObstacle);
    this.addObstacleEventListeners(newObstacle);
  }

  // Update existing obstacle
  private updateObstacle(preObstacle: Konva.Rect, obstacle: Obstacle) {
    preObstacle.setAttrs({
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color,
    });
  }

  private findObstacleById(id: string): Konva.Rect | null {
    return this.obstacleLayer.findOne((node: Konva.Node) => {
      return node instanceof Konva.Rect && node.getAttr('id') === id;
    }) as Konva.Rect;
  }

  // Function to add event listeners to a obstacle
  private addObstacleEventListeners(obstacle: Konva.Rect) {
    this.konvaEventService.bindObjectEvents(obstacle, {
      'mouseover': () => this.handleObstacleMouseOver(obstacle),
      'mouseout': () => this.handleObstacleMouseOut(obstacle),
    });
  }

  // Mouse hovers over a obstacle, displaying the tooltip
  private handleObstacleMouseOver(obstacle: Konva.Rect) {
    // Update target stroke style
    obstacle.setAttrs({
      stroke: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 1,
    });

    // Retrieve object position and dimensions
    const { x, y, width, height } = obstacle.getClientRect();
    const obstacleData = { x, y, width, height };
    
    this.updateTooltip(obstacleData);
    this.obstacleLayer.batchDraw();
  }

  // Mouse leaves a obstacle, hiding the tooltip
  private handleObstacleMouseOut(obstacle: Konva.Rect) {
    // Reset stroke style
    obstacle.setAttrs({
      stroke: null,
      strokeWidth: 0,
    });

    // Hide tooltip and render changes
    this.tooltipService.hideTooltip();
    this.obstacleLayer.batchDraw();
  }

  // Update Tooltip position and content
  private updateTooltip(
    obstacleData: Partial<Obstacle>,
  ) {
    const { x = 0, y = 0 } = obstacleData;
    const description = `Obstacle at (${Math.round(x)}, ${Math.round(y)})`;

    // Show the tooltip with calculated position and content
    this.tooltipService.showTooltip({
      description,
      targetData: obstacleData,
      container: this.stage.container(),
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
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.konvaCanvasService.adjustZoom(factor);
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
    this.moveCanvas(-1, 0);
  }

  // Move the stage right
  moveRight() {
    this.moveCanvas(1, 0);
  }

  // Adjust the canvas position by panning
  private moveCanvas(directionX: number, directionY: number) {
    this.konvaCanvasService.moveCanvas(directionX, directionY);
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
    this.konvaCanvasService.toggleLayerVisibility(layer);
  }  
}
