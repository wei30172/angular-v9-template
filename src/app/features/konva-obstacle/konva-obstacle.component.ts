import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime, withLatestFrom, filter, map } from 'rxjs/operators';
import Konva from 'konva';

import { ShapeMapping, ObstacleShapeManager, ShapeManager } from 'src/app/services/obstacle/shape-service/obstacle-shape-manager';
import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle//obstacle-form.service';
import { CanvasState, CanvasStateService } from 'src/app/services/obstacle/canvas-state.service';
import { KonvaCanvasService } from 'src/app/services/obstacle/konva-canvas.service';
import { KonvaEventService } from 'src/app/services/obstacle/konva-event.service';
import { KeyboardEventService } from 'src/app/services/shared/keyboard-event.service';
import { TooltipService } from 'src/app/services/shared/tooltip.service';
import { NotificationService } from 'src/app/services/shared/notification.service';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { CanvasSettings } from 'src/app/config/canvas-settings';
import { Obstacle, ObstacleType } from 'src/app/models/obstacle.model';

@Component({
  selector: 'app-konva-obstacle',
  templateUrl: './konva-obstacle.component.html',
  styleUrls: ['./konva-obstacle.component.scss']
})
export class KonvaObstacleComponent implements OnInit, AfterViewInit, OnDestroy {
  konvaObstacleCanvasId: string; // Dynamic ID for the Konva obstacle canvas
  isFormVisible = false; // Indicates if the form UI is visible
  isObstacleListVisible = true; // Indicates if the obstacle list UI is visible
  is3DViewVisible = false; // Indicates whether the 3D view is currently active
  currentType: ObstacleType = ObstacleType.Rectangle; // Current obstacle type selected for creation
  currentObstacle: Konva.Shape | null = null; // Currently selected or active obstacle on the canvas
  isObstacleLoading$: Observable<boolean>; // Indicates if obstacle data is loading
  
  private stage: Konva.Stage; // Konva stage for managing canvas elements
  private obstacleLayer: Konva.Layer; // Layer for rendering obstacles
  private transformer: Konva.Transformer; // Konva transformer for resizing and rotating obstacles
  private copiedObstacle: Partial<Obstacle> | null = null; // Temporarily stores a copied obstacle for paste operations
  private startX: number | null = null; // Starting X-coordinate for interactions like drag or draw
  private startY: number | null = null; // Starting Y-coordinate for interactions like drag or draw
  private canvasStateManager = new CanvasStateService(); // Service for managing canvas state transitions
  private destroy$ = new Subject<void>(); // Manages observable unsubscriptions
  private previousObstacles: Record<string, Obstacle> = {};

  constructor(
    private obstacleShapeManager: ObstacleShapeManager,
    private obstacleGenerationService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
    private konvaCanvasService: KonvaCanvasService,
    private konvaEventService: KonvaEventService,
    private keyboardEventService: KeyboardEventService,
    private tooltipService: TooltipService,
    private notificationService: NotificationService,
  ) {}

  // Get current obstacle ID
  get currentId(): string | null {
    return this.currentObstacle ? this.currentObstacle.getAttr('id') : null;
  }

  // Get obstacles$
  get obstacles$() {
    return this.obstacleGenerationService.obstacles$;
  }

  ngOnInit() {
    // Generate a unique canvas ID with a random suffix, e.g., konvaObstacleCanvas-abc123xyz
    this.konvaObstacleCanvasId = `konvaObstacleCanvas-${Math.random().toString(36).substring(2, 9)}`;
    
    // Subscribes to the loading state from the obstacle generation service
    this.isObstacleLoading$ = this.obstacleGenerationService.isLoading$;
  }

  ngAfterViewInit() {
    // Initialize canvas and layer
    this.initializeCanvas();

    // Mock background image: Load the background image for the canvas
    this.konvaCanvasService.loadBackgroundImage(CanvasSettings.BackgroundImageUrl);

    // Mock API: Generate random obstacles
    this.obstacleGenerationService.generateRandomObstacles(
      ObstacleSettings.DefaultObstacleCount,
      this.stage.width(),
      this.stage.height()
    );
    
    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToFormChanges(); // Subscribe to form changes
    this.subscribeToObstacles(); // Subscribe to obstacle data
    this.registerKeyboardShortcuts(); // Register keyboard shortcuts with actions
  }

  ngOnDestroy() {
    this.tooltipService.destroyTooltip();
    this.deselectObstacle();

    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();

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
      containerId: this.konvaObstacleCanvasId,
      layersConfig: { debugLayer: false },
    });
    this.stage = this.konvaCanvasService.getStage();
    this.obstacleLayer = this.konvaCanvasService.getObstacleLayer();
    this.transformer = this.konvaCanvasService.getTransformer();
  }

  // Subscribe to form changes
  private subscribeToFormChanges() {
    this.obstacleFormService.getFormVisibility()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isVisible: boolean) => this.isFormVisible = isVisible);

    this.obstacleFormService.getFormChanges()
      .pipe(
        takeUntil(this.destroy$),
        withLatestFrom(this.obstacleFormService.getFormVisibility()), // get form visibility status
        filter(([, isVisible]) => isVisible), // Only update when form is visible
        map(([formValue]) => formValue)
      )
      .subscribe((formValue: Partial<Obstacle>) => {
        if (this.currentObstacle) {
          const obstacleId = this.currentObstacle.getAttr('id');
          this.obstacleGenerationService.updateObstacle(obstacleId, formValue);
          this.updateShapeFromForm(formValue);
        }
      });
  }

  // Apply the updated form values to the obstacle's properties
  private updateShapeFromForm(values: Partial<Obstacle>) {
    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
    if (!result) return;
    
    const { manager, shape } = result;
    manager.updateFromForm(shape, values);
    shape.draw();
  }

  // Subscribe to obstacle list from service
  private subscribeToObstacles() {
    this.obstacleGenerationService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100), // Debounce to avoid too frequent updates
        distinctUntilChanged() // Only triggered when the data structure changes
      )
      .subscribe(obstacles => {
        this.renderChangedObstacles(obstacles); // Render only changed obstacles
        this.previousObstacles = this.mapObstaclesById(obstacles);
      });
  }

  // Compare obstacle data and update only changed obstacles
  private renderChangedObstacles(obstacles: Obstacle[]) {
    let requiresFullLayerRedraw = false;

    obstacles.forEach(obstacleData => {
      const previous = this.previousObstacles[obstacleData.id];
      if (!previous || JSON.stringify(previous) !== JSON.stringify(obstacleData)) {
        const shape = this.findShapeById(obstacleData.id);
        if (shape) {
          this.updateObstacleWithManager(shape, obstacleData);
          shape.draw();
        } else {
          this.createObstacleWithManager(obstacleData);
          requiresFullLayerRedraw = true;
        }
      }
    });

    if (requiresFullLayerRedraw) {
      this.obstacleLayer.batchDraw();
    }
  }

  // Convert obstacles to a map keyed by ID 
  private mapObstaclesById(obstacles: Obstacle[]): Record<string, Obstacle> {
    return obstacles.reduce((acc, obstacle) => {
      acc[obstacle.id] = obstacle;
      return acc;
    }, {} as Record<string, Obstacle>);
  }

    // Create new obstacle using ManagerService
  private createObstacleWithManager(obstacle: Obstacle) {
    // Get the manager for the obstacle type
    const manager = this.obstacleShapeManager.getShapeManagerByType(obstacle.shapeType);
    if (!manager) return;

    const newShape = manager.create(obstacle);

    this.obstacleLayer.add(newShape);
    this.addObstacleEventListeners(newShape, obstacle.id);
  }

  // Update existing obstacle using ManagerService
  private updateObstacleWithManager(shape: Konva.Shape, obstacle: Obstacle) {
    // Get the manager for the obstacle type
    const manager = this.obstacleShapeManager.getShapeManagerByType(obstacle.shapeType);
    if (!manager) return;

    // Dynamically cast shape to the correct type
    const castedShape = shape as ShapeMapping[typeof obstacle.shapeType]['shape'];
    manager.update(castedShape, obstacle as ShapeMapping[typeof obstacle.shapeType]['config']);

    // Update shape style based on overlap status
    const isValid = manager.checkOverlap(obstacle);
    shape.setAttrs({
      stroke: isValid ? 'red' : 'lime',
      strokeWidth: 1,
    });
  }

  // Bind the canvas interaction events
  private bindCanvasEvents() {
    // Mouse events for drawing obstacles
    this.stage.on('mousedown', (event: Konva.KonvaEventObject<MouseEvent>) => this.handleMouseDown(event));
    this.stage.on('mousemove', () => this.handleMouseMove());
    this.stage.on('mouseup', () => this.handleMouseUp());

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
      { keyCombo: 'arrowup', action: () => this.handleArrowKey(0, -1) },
      { keyCombo: 'arrowdown', action: () => this.handleArrowKey(0, 1) },
      { keyCombo: 'arrowleft', action: () => this.handleArrowKey(-1, 0) },
      { keyCombo: 'arrowright', action: () => this.handleArrowKey(1, 0) },
      { keyCombo: '+', action: () => this.handleScaleKey(1.1) },
      { keyCombo: '-', action: () => this.handleScaleKey(1 / 1.1) },
      { keyCombo: '=', action: () => this.handleScaleKey(1.1) },
      { keyCombo: '_', action: () => this.handleScaleKey(1 / 1.1) },
      { keyCombo: '[', action: () => this.rotateObstacle(-5) },
      { keyCombo: ']', action: () => this.rotateObstacle(5) },
      { keyCombo: 'delete', action: () => this.handleDeleteKeyPress() },
      { keyCombo: 'ctrl+c', action: () => this.copyCurrentObstacle() },
      { keyCombo: 'ctrl+v', action: () => this.pasteObstacleWithOffset() },
    ]);
  }

  // Handle arrow key presses to move either the obstacle or the canvas
  private handleArrowKey(directionX: number, directionY: number) {
    if (this.currentObstacle) {
      // If an obstacle is selected, move the obstacle
      this.moveObstacle(directionX, directionY);
    } else {
      // If no obstacle is selected, move the canvas
      this.moveCanvas(directionX, directionY);
    }
  }

  // Handle scale key presses to scale either the obstacle or the canvas
  private handleScaleKey(factor: number) {
    if (this.currentObstacle) {
      // If an obstacle is selected, scale the obstacle
      this.scaleObstacle(factor);
    } else {
      // If no obstacle is selected, adjust the zoom of the canvas
      this.adjustZoom(factor);
    }
  }

  // Perform an action on the current obstacle
  private performObstacleAction<T extends ObstacleType>(
    action: (
      manager: ShapeManager<ShapeMapping[T]['shape'], ShapeMapping[T]['config']>,
      shape: ShapeMapping[T]['shape']
    ) => void
  ): void {
    if (this.isFormVisible || !this.currentObstacle) return;
  
    // Hide tooltip
    this.tooltipService.hideTooltip();
    
    // Get the type from the obstacle and ensure it matches ObstacleType
    const shapeType = this.currentObstacle.getAttr('shapeType') as T;
    if (!shapeType || !(shapeType in this.obstacleShapeManager['shapeManagers'])) return;
  
    // Retrieve the manager for the obstacle type
    const manager = this.obstacleShapeManager.getShapeManagerByType(shapeType);
    if (!manager) return;
  
    // Cast currentObstacle to the corresponding shape type
    const shape = this.currentObstacle as ShapeMapping[T]['shape'];

    // Perform the provided action with the manager and shape
    action(manager, shape);
    shape.draw();

    this.showObstacleTooltip(shape);
  }

  // Move the obstacle by panning
  private moveObstacle(directionX: number = 1, directionY: number = 1) {
    // Calculate new x and y based on direction
    const offsetX = directionX * ObstacleSettings.MoveOffset;
    const offsetY = directionY * ObstacleSettings.MoveOffset;

    this.performObstacleAction((manager, shape) => {
      // Move the obstacle
      manager.move(shape, offsetX, offsetY);

      // Update the obstacle data
      manager.updateObstacleData(shape);
    });
  }

  // Adjust the obstacle scale
  private scaleObstacle(factor: number) {
    this.performObstacleAction((manager, shape) => {
      // Scale the obstacle
      manager.scale(shape, factor, factor);

      // Update the obstacle data
      manager.updateObstacleData(shape);
    });
  }

  // Rotate the obstacle
  private rotateObstacle(angle: number) {
    this.performObstacleAction((manager, shape) => {
      // Rotate the obstacle
      manager.rotate(shape, angle);
    
      // Update the obstacle data
      manager.updateObstacleData(shape);
    });
  }

  // Delete key press to remove the selected obstacle
  private handleDeleteKeyPress() {
    if (this.isFormVisible || !this.currentObstacle) return;
    const obstacleId = this.currentObstacle.getAttr('id');
    this.deleteObstacle(obstacleId);
  }

  // Copy selected obstacle data
  private copyCurrentObstacle() {
    if (this.isFormVisible || !this.currentObstacle) return;

    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
    if (!result) return;
    
    const { manager, shape } = result;
    this.copiedObstacle = manager.copyObstacleData(shape);
  }

  // Paste a new obstacle with a predefined offset
  private pasteObstacleWithOffset() {
    if (this.isFormVisible || !this.copiedObstacle) return;

    // Get the manager for the copied obstacle's type
    const manager = this.obstacleShapeManager.getShapeManagerByType(this.copiedObstacle.shapeType);
    if (!manager) return;
    
    // Generate unique ID for the new obstacle, e.g., obstacle-abc123xyz
    const id = `${this.copiedObstacle.shapeType}-${Math.random().toString(36).substring(2, 9)}`;

    const { newX, newY } = manager.calculateOffsetPosition(
      this.copiedObstacle,
      ObstacleSettings.MoveOffset,
      ObstacleSettings.MoveOffset,
      this.stage.width(),
      this.stage.height()
    );

    const newShape = manager.create({
      ...this.copiedObstacle,
      id,
      x: newX,
      y: newY,
    });

    this.obstacleLayer.add(newShape);
    manager.addObstacleData(newShape);

    this.addObstacleEventListeners(newShape, id);
    this.selectAndUpdateObstacle(newShape);

    // Update the position of copied obstacle
    this.copiedObstacle.x = newX;
    this.copiedObstacle.y = newY;
  }
  
  // Handles obstacle shape selection and updates its transform settings and canvas state
  private selectAndUpdateObstacle(shape: Konva.Shape) {
    // Enable dragging for the selected obstacle shape
    shape.draggable(true);

    // Set the selected obstacle in the transformer
    this.transformer.nodes([shape]);
    this.transformer.moveToTop();
    shape.moveToTop();

    // Update the currentObstacle reference
    this.currentObstacle = shape;

    // Unsubscribe from previous transformer events
    this.transformer.off('transformstart');
    this.transformer.off('transformend');

    // Attach new transformer event listeners
    this.transformer.on('transformstart', () => {
      this.canvasStateManager.setState(CanvasState.Transforming);
    });
  
    this.transformer.on('transformend', () => {
      this.canvasStateManager.setState(CanvasState.Idle);
    });
  }

  // Deselect transformer and hide the delete icon
  private deselectObstacle() {
    this.transformer.nodes([]);
    
    this.transformer.off('transformstart');
    this.transformer.off('transformend');
    
    this.currentObstacle = null;
    this.canvasStateManager.setState(CanvasState.Idle);
  }

  // Handle mouse down event for starting obstacle drawing or dragging
  private handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    if (
      this.canvasStateManager.isTransforming() ||
      this.canvasStateManager.isDragging() ||
      this.canvasStateManager.isDrawing()
    ) {
      return;
    }
    
    if (event.target.id()) {
      this.canvasStateManager.setState(CanvasState.Dragging);
      return;
    }

    // Deselect any previously selected object
    if (this.currentObstacle) {
      this.deselectObstacle();
      return
    }

    // Start drawing a new obstacle
    this.initiateDrawing();
  }

  // Start drawing a new obstacle
  private initiateDrawing() {
    const pointer = this.stage.getRelativePointerPosition();
    if (!pointer) return;

    this.canvasStateManager.setState(CanvasState.Drawing);

    this.startX = pointer.x;
    this.startY = pointer.y;
  }
  
  // Handle mouse move event for updating obstacle dimensions
  private handleMouseMove() {
    if (!this.canvasStateManager.isDrawing()) return;

    const pointer = this.stage.getRelativePointerPosition();
    if (!pointer) return;

    this.updateDrawing(pointer.x, pointer.y);
  }

  // Update the size of the obstacle during drawing
  private updateDrawing(pointerX: number, pointerY: number) {
    const distanceX = Math.abs(pointerX - this.startX!);
    const distanceY = Math.abs(pointerY - this.startY!);

    // Check if the mouse moved enough to start drawing a obstacle
    if (!this.currentObstacle && this.isDragDistanceSufficient(distanceX, distanceY)) {
      this.createNewObstacle();
    }

    // Only resize if an obstacle is already created
    if (this.currentObstacle) {
      this.resizeCurrentObstacle(distanceX, distanceY);
    }
  }

  // Check if the drag distance is sufficient
  private isDragDistanceSufficient(distanceX: number, distanceY: number): boolean {
    return distanceX > ObstacleSettings.MinDrag && distanceY > ObstacleSettings.MinDrag;
  }

  // Create a new obstacle
  private createNewObstacle() {
    // Get the manager for the current type
    const manager = this.obstacleShapeManager.getShapeManagerByType(this.currentType);
    if (!manager) return;

    // Generate unique ID for the new obstacle, e.g., obstacle-abc123xyz
    const id = `${this.currentType}-${Math.random().toString(36).substring(2, 9)}`;

    // Generate a random color
    const randomColor = this.obstacleGenerationService.getRandomColor();

    const newShape = manager.create({
      id,
      x: Math.floor(this.startX),
      y: Math.floor(this.startY),
      color: randomColor,
    }, false); // Not draggable initially

    this.obstacleLayer.add(newShape);
    this.currentObstacle = newShape;
  }

  // Resize the current obstacle
  private resizeCurrentObstacle(distanceX: number, distanceY: number) {
    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
    if (!result) return;

    const { manager, shape } = result;
    manager.resize(shape, distanceX, distanceY);
    this.obstacleLayer.batchDraw();
  }

  // Handle mouse up event to finalize the obstacle
  private handleMouseUp() {
    if (!this.canvasStateManager.isDrawing()) return;

    this.canvasStateManager.setState(CanvasState.Idle);

    const pointer = this.stage.getRelativePointerPosition();
    if (!pointer || !this.currentObstacle) return;

    const distanceX = Math.abs(pointer.x - this.startX!);
    const distanceY = Math.abs(pointer.y - this.startY!);

    // Check if the bounds meet the minimum drag distance
    if (!this.isDragDistanceSufficient(distanceX, distanceY)) {
      this.cleanupIncompleteObstacle();
    } else {
      this.finalizeNewObstacle();
    }

    this.resetDrawingState();
  }
  
  // Clean up incomplete obstacle
  private cleanupIncompleteObstacle() {
    this.currentObstacle.destroy();
    this.currentObstacle = null;
  }

  // Finalize the new obstacle
  private finalizeNewObstacle() {
    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
    if (!result) return;
    
    const { manager, shape } = result;
    manager.addObstacleData(shape)

    this.addObstacleEventListeners(shape, shape.getAttr('id'));
    this.selectAndUpdateObstacle(shape);
  }

  // Reset drawing-related state
  private resetDrawingState() {
    this.startX = null;
    this.startY = null;
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
    this.tooltipService.destroyTooltip();
  }

  private findShapeById<T extends Konva.Shape>(id: string): T | null {
    return this.obstacleLayer.findOne((node: Konva.Node) => {
      return node instanceof Konva.Shape && node.getAttr('id') === id;
    }) as T | null;
  }
  
  // Function to add event listeners to a obstacle
  private addObstacleEventListeners(obstacle: Konva.Shape, obstacleId: string) {
    this.konvaEventService.bindObjectEvents(obstacle, {
      'dragstart': () => this.handleObstacleDragStart(),
      'dragend': () => this.handleObstacleDragEnd(obstacle, obstacleId),
      'click': () => this.handleObstacleClick(obstacle),
      'transformend': () => this.handleObstacleTransform(obstacle),
      'mouseover': () => this.handleObstacleMouseOver(obstacle),
      'mouseout': () => this.handleObstacleMouseOut(obstacle),
      'dblclick': () => this.showEditForm(obstacleId),
    });
  }

  // Hide delete icon and tooltip on drag start
  private handleObstacleDragStart() {
    this.tooltipService.destroyTooltip();
    this.canvasStateManager.setState(CanvasState.Dragging);
  }

  // Update position when obstacle is dragged
  private handleObstacleDragEnd(obstacle: Konva.Shape, obstacleId: string) {
    const { x, y } = obstacle.position();
    this.obstacleGenerationService.updateObstacle(obstacleId, { x, y });

    this.canvasStateManager.setState(CanvasState.Idle);
    this.showObstacleTooltip(obstacle);
    this.selectAndUpdateObstacle(obstacle);
  }

  // Enable transformer when obstacle is clicked
  private handleObstacleClick(obstacle: Konva.Shape) {
    this.deselectObstacle();
    this.selectAndUpdateObstacle(obstacle);
  }

  // Update size and rotation after the transformation (resizing and rotation)
  private handleObstacleTransform(obstacle: Konva.Shape) {
    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(obstacle);
    if (!result) return;
    
    const { manager, shape } = result;
    
    manager.transform(shape, {
      scaleX: shape.scaleX(),
      scaleY: shape.scaleY(),
      rotate: shape.rotation(),
    });
    
    // Update the obstacle data
    manager.updateObstacleData(shape);
    shape.draw();

    this.canvasStateManager.setState(CanvasState.Idle);
  }

  // Mouse hovers over a obstacle, displaying the tooltip
  private handleObstacleMouseOver(obstacle: Konva.Shape) {
    // Update obstacle's stroke style
    obstacle.setAttrs({
      stroke: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 1,
    });

    this.showObstacleTooltip(obstacle);
  }

  // Mouse leaves a obstacle, hiding the tooltip
  private handleObstacleMouseOut(obstacle: Konva.Shape) {
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
    });
  }

  // Show the edit form and save the original data
  private showEditForm(obstacleId: string) {
    this.tooltipService.destroyTooltip();
    
    const obstacle = this.obstacleGenerationService.getObstacleById(obstacleId);
    this.currentType = obstacle.shapeType;
    
    if (obstacle) {
      // Show form with current obstacle data
      this.obstacleFormService.showForm(obstacle);
      
      // Show notification
      this.notificationService.open(`Editing obstacle with ID: ${obstacleId}`);

    } else {
      // Show error notification if obstacle not found
      this.notificationService.open(`Obstacle with ID: ${obstacleId} not found`);
    }
  }
  // Close the popup form
  closeEditForm() {
    this.obstacleFormService.closeForm();
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

  // Toggle obstacle list visibility
  toggleObstacleList() {
    this.isObstacleListVisible = !this.isObstacleListVisible;
    if (this.isObstacleListVisible) {
      this.is3DViewVisible = false;
    }
  }

  // Toggle 3D View visibility
  toggle3DView() {
    this.is3DViewVisible = !this.is3DViewVisible;
    if (this.is3DViewVisible) {
      this.isObstacleListVisible = false;
    }
  }

  // Select an obstacle from the list and set it as active on the canvas
  selectObstacle(obstacleId: string) {
    const selectedShape = this.findShapeById(obstacleId);

    if (selectedShape) {
      // Show notification for selection
      this.notificationService.open(`Selected obstacle with ID: ${obstacleId}`);

      this.selectAndUpdateObstacle(selectedShape);
    } else {
      // Show error notification if obstacle not found
      this.notificationService.open(`Obstacle with ID: ${obstacleId} not found`);
    }
  }

  // Delete an obstacle from the canvas and the obstacle list
  deleteObstacle(obstacleId: string) {
    const confirmDelete = window.confirm('Are you sure you want to delete this obstacle?');
    if (!confirmDelete) return;
    
    const shape = this.findShapeById(obstacleId);

    if (shape) {
      // Show notification for deletion
      this.notificationService.open(`Deleted obstacle with ID: ${obstacleId}`);

      this.removeObstacleFromCanvasAndList(shape, obstacleId);
    } else {
      // Show error notification if obstacle not found
      this.notificationService.open(`Obstacle with ID: ${obstacleId} not found`);
    }
  }

  // Remove the obstacle shape from the canvas and obstacle map
  private removeObstacleFromCanvasAndList(shape: Konva.Shape, obstacleId: string) {
    // Remove the obstacle from the canvas
    shape.destroy();
    this.deselectObstacle()
    this.obstacleGenerationService.removeObstacle(obstacleId);
  }

  // Set the selected shape
  onShapeSelected(shape: ObstacleType) {
    this.currentType = shape;
    this.notificationService.open(`Shape selected: ${shape}`);
  }
}