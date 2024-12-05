import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime, withLatestFrom, filter, map } from 'rxjs/operators';
import Konva from 'konva';

import { ShapeMapping, ObstacleShapeManager, ShapeManager } from 'src/app/services/obstacle-testing/shape-service/obstacle-shape-manager';
import { ObstacleSettings, ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';
import { CanvasState, CanvasStateService } from 'src/app/services/obstacle-testing/canvas-state.service';
import { KonvaCanvasService } from 'src/app/services/obstacle-testing/konva-canvas.service';
import { KonvaEventService } from 'src/app/services/obstacle-testing/konva-event.service';
import { KeyboardEventService } from 'src/app/services/shared/keyboard-event.service';
import { TooltipService } from 'src/app/services/shared/tooltip.service';
import { NotificationService } from 'src/app/services/shared/notification.service';
import { Obstacle, ObstacleType } from 'src/app/models/obstacle.model';

@Component({
  selector: 'app-konva-obstacle',
  templateUrl: './konva-obstacle.component.html',
  styleUrls: ['./konva-obstacle.component.scss']
})
export class KonvaObstacleComponent implements OnInit, AfterViewInit, OnDestroy {
  // Dynamic ID for konvaObstacleCanvas
  konvaObstacleCanvasId: string;

  // Constants for canvas behavior
  private readonly OBSTACLE_COUNT = 20;

  isFormVisible = false;
  isObstacleListVisible = false; 
  currentType: ObstacleType = ObstacleType.Rectangle;
  currentObstacle: Konva.Shape | null = null;

  private stage: Konva.Stage;
  private obstacleLayer: Konva.Layer;
  private transformer: Konva.Transformer;
  private copiedObstacle: Partial<Obstacle> | null = null;
  private startX: number | null = null;
  private startY: number | null = null;
  private destroy$ = new Subject<void>();
  private canvasStateManager = new CanvasStateService();

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
  }

  ngAfterViewInit() {
    // Initialize canvas and layer
    this.initializeCanvas();

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
    this.konvaCanvasService.initializeStage(this.konvaObstacleCanvasId);
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
    this.obstacleLayer.batchDraw();
  }

  // Subscribe to obstacle list from service
  private subscribeToObstacles() {
    this.obstacleGenerationService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100), // Debounce to avoid too frequent updates
        distinctUntilChanged() // Ensure updates only when data changes
      )
      .subscribe(obstacles => {
        this.renderObstacles(obstacles); // Render or update obstacles on the canvas
      });
    
    this.obstacleGenerationService.obstacleUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(updatedObstacle => {
        if (updatedObstacle) {
          this.renderObstacle(updatedObstacle);
        }
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
    this.obstacleLayer.batchDraw();

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
  
  // Handles obstacle selection and updates its transform settings and canvas state
  private selectAndUpdateObstacle(obstacle: Konva.Shape) {
    obstacle.draggable(true);
    this.transformer.nodes([obstacle]);
    this.transformer.moveToTop();
    obstacle.moveToTop();

    this.currentObstacle = obstacle;
    this.obstacleLayer.draw();

    this.transformer.off('transformstart');
    this.transformer.off('transformend');

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
    this.obstacleLayer.batchDraw();
    
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
    
    if (event.target.id() && event.target.id().includes('obstacle')) {
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
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    this.canvasStateManager.setState(CanvasState.Drawing);

    this.startX = pointer.x;
    this.startY = pointer.y;
    this.currentObstacle = null;
  }
  
  // Update the size of the obstacle as the mouse moves
  private handleMouseMove() {
    if (!this.canvasStateManager.isDrawing()) return;

    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    this.updateDrawing(pointer.x, pointer.y);
  }

  // Adjust the obstacle dimensions during drawing
  private updateDrawing(pointerX: number, pointerY: number) {
    const distanceX = Math.abs(pointerX - this.startX!);
    const distanceY = Math.abs(pointerY - this.startY!);

    // Check if the mouse moved enough to start drawing a obstacle
    if (
      !this.currentObstacle &&
      (
        distanceX > ObstacleSettings.MinDrag || 
        distanceY > ObstacleSettings.MinDrag
      )
    ) {
      this.createNewObstacle();
    }

    if (this.currentObstacle) {
      // Get the current manager and shape
      const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
      if (!result) return;

      const { manager, shape } = result;
      manager.resize(shape, distanceX, distanceY);

      this.obstacleLayer.batchDraw();
    }
  }

  // Create a new obstacle
  private createNewObstacle() {
    // Get the manager for the current type
    const manager = this.obstacleShapeManager.getShapeManagerByType(this.currentType);
    if (!manager) return;

    // Generate unique ID for the new obstacle, e.g., obstacle-abc123xyz
    const id = `${this.currentType}-${Math.random().toString(36).substring(2, 9)}`;

    const randomColor = this.obstacleGenerationService.getRandomColor();

    const newShape = manager.create({
      id,
      x: Math.floor(this.startX),
      y: Math.floor(this.startY),
      color: randomColor,
    }, false); // Set draggable to false

    this.obstacleLayer.add(newShape);
    this.currentObstacle = newShape;
  }

  // Finalize drawing the obstacle on mouse up
  private handleMouseUp() {
    if (!this.canvasStateManager.isDrawing() || !this.currentObstacle) return;

    this.canvasStateManager.setState(CanvasState.Idle);

    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
    if (!result) return;
    
    const { manager, shape } = result;
    const shapeData = manager.calculateBoundingBox(shape);

    // Check if the bounds are valid (non-zero width and height)
    if (shapeData.width > 0 && shapeData.height > 0) {
      this.finalizeNewObstacle(); // Finalize and save the new obstacle
    } else {
      shape.destroy(); // Remove invalid obstacles
    }

    this.startX = null;
    this.startY = null;
  }
  
  // Finalize a new obstacle as an obstacle
  private finalizeNewObstacle() {
    // Get the current manager and shape
    const result = this.obstacleShapeManager.getShapeAndManager(this.currentObstacle);
    if (!result) return;
    
    const { manager, shape } = result;
    manager.addObstacleData(shape)

    this.addObstacleEventListeners(shape, shape.getAttr('id'));
    this.selectAndUpdateObstacle(shape);
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
    this.tooltipService.destroyTooltip();
  }

  // Render or update obstacles on the canvas
  private renderObstacles(obstaclesData: Obstacle[]) {
    obstaclesData.forEach(obstacleData => {
      this.renderObstacle(obstacleData);
    });
    this.obstacleLayer.batchDraw();
  }

  // Render or update obstacle on the canvas
  private renderObstacle(obstacleData: Obstacle) {
    const obstacle = this.findObstacleById(obstacleData.id);
      if (obstacle) {
        this.updateObstacleWithManager(obstacle, obstacleData);
      } else {
        this.createObstacleWithManager(obstacleData);
      }
    this.obstacleLayer.batchDraw();
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
  private addObstacleEventListeners(obstacle: Konva.Shape, obstacleId: string) {
    this.konvaEventService.bindObjectEvents(obstacle, {
      'dragstart': () => this.handleObstacleDragStart(),
      'dragmove': () => this.handleObstacleDraging(obstacle, obstacleId),
      'dragend': () => this.handleObstacleDragEnd(obstacle),
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

  // Update state and tooltip on drag end
  private handleObstacleDraging(obstacle: Konva.Shape, obstacleId: string) {
    const { x, y } = obstacle.position();
    this.obstacleGenerationService.updateObstacle(obstacleId, { x, y });
  }

  // Update position when obstacle is dragged
  private handleObstacleDragEnd(obstacle: Konva.Shape) {
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

    this.canvasStateManager.setState(CanvasState.Idle);
    this.obstacleLayer.draw();
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
  }

  // Select an obstacle from the list and set it as active on the canvas
  selectObstacle(obstacleId: string) {
    const selectedOstacle = this.findObstacleById(obstacleId);

    if (selectedOstacle) {
      // Show notification for selection
      this.notificationService.open(`Selected obstacle with ID: ${obstacleId}`);

      this.selectAndUpdateObstacle(selectedOstacle);
    } else {
      // Show error notification if obstacle not found
      this.notificationService.open(`Obstacle with ID: ${obstacleId} not found`);
    }
  }

  // Delete an obstacle from the canvas and the obstacle list
  deleteObstacle(obstacleId: string) {
    const confirmDelete = window.confirm('Are you sure you want to delete this obstacle?');
    if (!confirmDelete) return;
    
    const obstacle = this.findObstacleById(obstacleId);

    if (obstacle) {
      // Show notification for deletion
      this.notificationService.open(`Deleted obstacle with ID: ${obstacleId}`);

      this.removeObstacleFromCanvasAndList(obstacle, obstacleId);
    } else {
      // Show error notification if obstacle not found
      this.notificationService.open(`Obstacle with ID: ${obstacleId} not found`);
    }
  }

  // Remove the obstacle from the canvas and obstacle map
  private removeObstacleFromCanvasAndList(obstacle: Konva.Shape, obstacleId: string) {
    // Remove the obstacle from the canvas
    obstacle.destroy();
    this.deselectObstacle()
    this.obstacleGenerationService.removeObstacle(obstacleId);
  }

  // Set the selected shape
  onShapeSelected(shape: ObstacleType) {
    this.currentType = shape;
    this.notificationService.open(`Shape selected: ${shape}`);
  }
}