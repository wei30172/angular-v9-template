import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime, withLatestFrom, filter, map } from 'rxjs/operators';
import Konva from 'konva';

import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';
import { CanvasState, CanvasStateManager } from 'src/app/services/obstacle-testing/canvas-state-manager';
import { KonvaCanvasService } from 'src/app/services/obstacle-testing/konva-canvas.service';
import { KonvaEventService } from 'src/app/services/obstacle-testing/konva-event.service';
import { KeyboardEventService } from 'src/app/services/shared/keyboard-event.service';
import { TooltipService } from 'src/app/services/shared/tooltip.service';
import { NotificationService } from 'src/app/services/shared/notification.service';
import { Obstacle } from './obstacle.model';

enum ObstacleSettings {
  MinDrag = 5,
  MoveOffset = 10,
}

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

  obstacleForm: FormGroup;
  isFormVisible = false;
  isObstacleListVisible = false; 
  showDeleteIcon = false;
  deleteIconStyle = {};
  selectedShape: string = 'rectangle';

  private stage: Konva.Stage;
  private obstacleLayer: Konva.Layer;
  private transformer: Konva.Transformer;
  private currentObstacle: Konva.Rect | null = null;
  private copiedObstacle: Partial<Obstacle> | null = null;
  private startX: number | null = null;
  private startY: number | null = null;
  private destroy$ = new Subject<void>();
  private canvasStateManager = new CanvasStateManager();

  constructor(
    private obstacleService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
    private konvaCanvasService: KonvaCanvasService,
    private konvaEventService: KonvaEventService,
    private keyboardEventService: KeyboardEventService,
    private tooltipService: TooltipService,
    private notificationService: NotificationService,
  ) {
    // Initialize the obstacle form
    this.obstacleForm = this.obstacleFormService.getForm();
  }

  // Get current obstacle ID
  get currentId(): string | null {
    return this.currentObstacle ? this.currentObstacle.getAttr('id') : null;
  }

  // Get obstacles$
  get obstacles$() {
    return this.obstacleService.obstacles$;
  }

  ngOnInit() {
    // Generate a unique canvas ID with Date.now() and a random suffix
    this.konvaObstacleCanvasId = `konvaObstacleCanvas-${Math.random().toString(36).substring(2, 9)}`;
  }

  ngAfterViewInit() {
    this.initializeCanvas(); // Initialize canvas and layer
    this.loadBackgroundImage(); // Load the background image

    this.obstacleService.generateRandomObstacles( // Generate default obstacles
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
      { keyCombo: 'arrowup', action: () => this.handleArrowKey(0, -1) },
      { keyCombo: 'arrowdown', action: () => this.handleArrowKey(0, 1) },
      { keyCombo: 'arrowleft', action: () => this.handleArrowKey(-1, 0) },
      { keyCombo: 'arrowright', action: () => this.handleArrowKey(1, 0) },
      { keyCombo: '+', action: () => this.handleScaleKey(1.1) },
      { keyCombo: '-', action: () => this.handleScaleKey(1 / 1.1) },
      { keyCombo: '=', action: () => this.handleScaleKey(1.1) },
      { keyCombo: '_', action: () => this.handleScaleKey(1 / 1.1) },
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

  // Move the obstacle by panning
  private moveObstacle(directionX: number = 1, directionY: number = 1) {
    if (!this.currentObstacle) return;

    this.tooltipService.hideTooltip();

    // Calculate new x and y based on direction
    const offsetX = directionX * ObstacleSettings.MoveOffset;
    const offsetY = directionY * ObstacleSettings.MoveOffset;

    // Get current position and calculate new position
    const newX = this.currentObstacle.x() + offsetX;
    const newY = this.currentObstacle.y() + offsetY;

    // Update the obstacle's position
    this.currentObstacle.setAttrs({ x: newX, y: newY });

    const obstacleId = this.currentObstacle.getAttr('id');
    this.obstacleService.updateObstacle(obstacleId, { x: newX, y: newY });
    
    this.updateDeleteIconPosition(this.currentObstacle);
    this.obstacleLayer.batchDraw();

    if (this.isFormVisible) {
      this.obstacleFormService.patchFormValue({
        x: this.currentObstacle.x(),
        y: this.currentObstacle.y(),
        width: this.currentObstacle.width(),
        height: this.currentObstacle.height(),
        color: this.currentObstacle.fill() as string,
      });
    }
  }

  // Adjust the obstacle scale
  private scaleObstacle(factor: number) {
    if (!this.currentObstacle) return;

    this.tooltipService.hideTooltip();

    // Calculate new width and height based on factor
    const newWidth = this.currentObstacle.width() * factor;
    const newHeight = this.currentObstacle.height() * factor;

    // Update the obstacle's size
    this.currentObstacle.setAttrs({
      width: newWidth,
      height: newHeight,
      scaleX: 1,
      scaleY: 1,
    })

    const obstacleId = this.currentObstacle.getAttr('id');
    this.obstacleService.updateObstacle(obstacleId, {
      width: newWidth,
      height: newHeight,
    });

    this.updateDeleteIconPosition(this.currentObstacle);
    this.obstacleLayer.batchDraw();

    if (this.isFormVisible) {
      this.obstacleFormService.patchFormValue({
        x: this.currentObstacle.x(),
        y: this.currentObstacle.y(),
        width: this.currentObstacle.width(),
        height: this.currentObstacle.height(),
        color: this.currentObstacle.fill() as string,
      });
    }
  }

  // Copy selected obstacle data
  private copyCurrentObstacle() {
    if (this.isFormVisible) return;

    if (this.currentObstacle) {
      this.copiedObstacle = {
        x: this.currentObstacle.x(),
        y: this.currentObstacle.y(),
        width: this.currentObstacle.width(),
        height: this.currentObstacle.height(),
        color: this.currentObstacle.fill() as string,
      };
    }
  }

  // Paste a new obstacle with a predefined offset
  private pasteObstacleWithOffset() {
    if (this.isFormVisible) return;

    if (this.copiedObstacle) {
      const { newX, newY } = this.calculateOffsetPosition();

      // Assign new ID for the new obstacle
      const id = Date.now().toString();
      
      const newObstacle = new Konva.Rect({
        x: newX,
        y: newY,
        width: this.copiedObstacle.width,
        height: this.copiedObstacle.height,
        fill: this.copiedObstacle.color,
        draggable: true,
      });
     
      newObstacle.setAttr('id', id);
      this.obstacleLayer.add(newObstacle);
      this.addObstacleEventListeners(newObstacle, id);

      this.obstacleService.addObstacle({
        id,
        x: newObstacle.x(),
        y: newObstacle.y(),
        width: newObstacle.width(),
        height: newObstacle.height(),
        color: newObstacle!.fill() as string,
      });
      
      this.selectAndUpdateObstacle(newObstacle);

      // Update the position of copied obstacle
      this.copiedObstacle.x = newX;
      this.copiedObstacle.y = newY;
    }
  }

  // Calculate the new position with an offset while ensuring it stays within boundaries
  private calculateOffsetPosition() {
    let newX = this.copiedObstacle.x + ObstacleSettings.MoveOffset;
    let newY = this.copiedObstacle.y + ObstacleSettings.MoveOffset;

    // Ensure obstacle remains within canvas boundaries
    if (newX + this.copiedObstacle.width > this.stage.width()) {
      newX = this.stage.width() - this.copiedObstacle.width;
    }
    if (newY + this.copiedObstacle.height > this.stage.height()) {
      newY = this.stage.height() - this.copiedObstacle.height;
    }

    return { newX, newY };
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

  // Handle the obstacle selection logic and update the delete icon
  private selectAndUpdateObstacle(obstacle: Konva.Rect) {
    obstacle.draggable(true);

    this.transformer.nodes([obstacle]);
    this.transformer.moveToTop();
    obstacle.moveToTop();

    this.currentObstacle = obstacle;

    this.updateDeleteIconPosition(obstacle);
    this.obstacleLayer.draw();
  }

  // Update the position of the delete icon relative to the selected obstacle
  private updateDeleteIconPosition(obstacle: Konva.Rect) {
    const boundingRect = obstacle.getClientRect();
    const containerRect = this.stage.container().getBoundingClientRect();
    
    this.deleteIconStyle = {
      position: 'absolute',
      top: `${containerRect.top + boundingRect.y - 10}px`,
      left: `${containerRect.left + boundingRect.x + boundingRect.width + 10}px`,
    };

    this.showDeleteIcon = true;
  }

  // Deselect transformer and hide the delete icon
  private deselectObstacle() {
    this.hideDeleteIcon();

    this.transformer.nodes([]);
    this.obstacleLayer.batchDraw();
    
    this.currentObstacle = null;
    this.canvasStateManager.setState(CanvasState.Idle);
  }

  // Hide the delete icon
  private hideDeleteIcon() {
    this.showDeleteIcon = false;
    this.deleteIconStyle = {};
  }

  // Handle mouse down event for starting obstacle drawing or dragging
  private handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    if (this.canvasStateManager.isDragging() || this.canvasStateManager.isDrawing()) return;

    if (event.target instanceof Konva.Rect) {
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
      this.currentObstacle.size({ width: distanceX, height: distanceY });
      this.obstacleLayer.batchDraw();
    }
  }

  // Create a new obstacle
  private createNewObstacle() {
    const randomColor = this.obstacleService.getRandomColor();

    // Assign new ID for the new obstacle
    const id = Date.now().toString();

    const newObstacle = new Konva.Rect({
      x: this.startX,
      y: this.startY,
      width: 0,
      height: 0,
      fill: randomColor,
      draggable: false,
    });

    newObstacle.setAttr('id', id);
    this.obstacleLayer.add(newObstacle);
    this.currentObstacle = newObstacle;
  }

  // Finalize drawing the obstacle on mouse up
  private handleMouseUp() {
    if (!this.canvasStateManager.isDrawing() || !this.currentObstacle) return;

    this.canvasStateManager.setState(CanvasState.Idle);
    const width = this.currentObstacle.width();
    const height = this.currentObstacle.height();

    if (width > 0 && height > 0) {
      this.finalizeNewObstacle(); // Finalize and save the new obstacle
    } else {
      this.currentObstacle.destroy();  // Remove invalid obstacles
    }

    this.startX = null;
    this.startY = null;
  }
  
  // Finalize a new obstacle as an obstacle
  private finalizeNewObstacle() {
    const obstacleId = this.currentObstacle.getAttr('id');
    this.addObstacleEventListeners(this.currentObstacle, obstacleId);
    
    this.obstacleService.addObstacle({
      id: obstacleId,
      x: this.currentObstacle.x(),
      y: this.currentObstacle.y(),
      width: this.currentObstacle.width(),
      height: this.currentObstacle.height(),
      color: this.currentObstacle!.fill() as string,
    });

    this.selectAndUpdateObstacle(this.currentObstacle);
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    this.hideDeleteIcon();

    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
  
    // Adjust zoom level
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
  }
  
  // Subscribe to form changes
  private subscribeToFormChanges() {
    this.obstacleFormService.getFormVisibility()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isVisible => this.isFormVisible = isVisible);

    this.obstacleFormService.getFormChanges()
      .pipe(
        takeUntil(this.destroy$),
        withLatestFrom(this.obstacleFormService.getFormVisibility()), // get form visibility status
        filter(([, isVisible]) => isVisible), // Only update when form is visible
        map(([formValue]) => formValue)
      )
      .subscribe(formValue => {
        if (this.currentObstacle) {
          const obstacleId = this.currentObstacle.getAttr('id');
          this.obstacleService.updateObstacle(obstacleId, formValue);
          this.updateObstacleProperties(this.currentObstacle, formValue);
        }
      });
  }

  // Update obstacle properties on the canvas
  private updateObstacleProperties(obstacle: Konva.Rect, values: Partial<Obstacle>) {
    // != null => If value is not null or undefined, use it
    const updatedProperties = {
      x: values.x != null ? Number(values.x) : obstacle.x(),
      y: values.y != null ? Number(values.y) : obstacle.y(),
      width: values.width != null ? Number(values.width) : obstacle.width(),
      height: values.height != null ? Number(values.height) : obstacle.height(),
      fill: values.color ?? obstacle.fill(),
    };
    obstacle.setAttrs(updatedProperties);
    this.obstacleLayer.batchDraw();
  }

  // Subscribe to obstacle list from service
  private subscribeToObstacles() {
    this.obstacleService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100), // Debounce to avoid too frequent updates
        distinctUntilChanged() // Ensure updates only when data changes
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
    this.addObstacleEventListeners(newObstacle, obstacle.id);
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
  private addObstacleEventListeners(obstacle: Konva.Rect, obstacleId: string) {
    this.konvaEventService.bindObjectEvents(obstacle, {
      'dragstart': () => this.handleObstacleDragStart(),
      'dragmove': () => this.handleObstacleDraging(obstacle, obstacleId),
      'dragend': () => this.handleObstacleDragEnd(obstacle),
      'click': () => this.handleObstacleClick(obstacle),
      'transformend': () => this.handleObstacleTransform(obstacle, obstacleId),
      'mouseover': () => this.handleObstacleMouseOver(obstacle),
      'mouseout': () => this.handleObstacleMouseOut(obstacle),
      'dblclick': () => this.showEditForm(obstacleId),
    });
  }

  // Update position when obstacle is dragged
  private handleObstacleDragStart() {
    this.hideDeleteIcon();
    this.tooltipService.hideTooltip();
    this.canvasStateManager.setState(CanvasState.Dragging);
  }

  // Update position when obstacle is dragged
  private handleObstacleDraging(obstacle: Konva.Rect, obstacleId: string) {
    const { x, y } = obstacle.position();
    this.obstacleService.updateObstacle(obstacleId, { x, y });
  }

  // Update position when obstacle is dragged
  private handleObstacleDragEnd(obstacle: Konva.Rect) {
    this.canvasStateManager.setState(CanvasState.Idle);

    this.updateTooltip(
      { x: obstacle.x()!, y: obstacle.y()!, width: obstacle.width()!, height: obstacle.height()! },
    );

    this.selectAndUpdateObstacle(obstacle);
  }

  // Enable transformer when obstacle is clicked
  private handleObstacleClick(obstacle: Konva.Rect) {
    this.deselectObstacle();
    this.selectAndUpdateObstacle(obstacle);
  }

  // Update size after the transformation (resizing)
  private handleObstacleTransform(obstacle: Konva.Rect, obstacleId: string) {
    const newAttrs = {
      x: obstacle.x(),
      y: obstacle.y(),
      width: obstacle.width() * obstacle.scaleX(),
      height: obstacle.height() * obstacle.scaleY(),
    };

    // Update the obstacle's position and size
    obstacle.setAttrs({
      x: newAttrs.x,
      y: newAttrs.y,
      width: newAttrs.width,
      height: newAttrs.height,
      scaleX: 1,
      scaleY: 1,
    });

    // Update the obstacle data in the service
    this.obstacleService.updateObstacle(obstacleId, {
      x: newAttrs.x,
      y: newAttrs.y,
      width: newAttrs.width,
      height: newAttrs.height,
    });

    this.canvasStateManager.setState(CanvasState.Idle);

    this.updateDeleteIconPosition(obstacle);
    this.obstacleLayer.draw();
  }

  // Mouse hovers over a obstacle, displaying the tooltip
  private handleObstacleMouseOver(obstacle: Konva.Rect) {
    // Update obstacle's stroke style
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
    // Reset obstacle's style
    obstacle.setAttrs({
      stroke: null,
      strokeWidth: 0,
    });
    
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

  // Show the edit form and save the original data
  private showEditForm(obstacleId: string) {
    const obstacle = this.obstacleService.getObstacleById(obstacleId);

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
  
  // Submit the edit form
  submitEditForm() {
    this.obstacleFormService.hideForm();
  }

  // Close the popup form
  closeEditForm() {
    this.obstacleFormService.hideForm();
  }

  // Cancel the form and revert to original values
  cancelEditForm() {
    this.obstacleFormService.cancelForm();
    this.updateDeleteIconPosition(this.currentObstacle);
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
    this.hideDeleteIcon();
    this.konvaCanvasService.resetZoom();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.hideDeleteIcon();
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
    this.hideDeleteIcon();
    this.konvaCanvasService.moveCanvas(directionX, directionY);
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

      this.removeObstacleAndObstacle(obstacle, obstacleId);
    } else {
      // Show error notification if obstacle not found
      this.notificationService.open(`Obstacle with ID: ${obstacleId} not found`);
    }
  }

  // Remove the obstacle from the canvas and obstacle map
  private removeObstacleAndObstacle(obstacle: Konva.Rect, obstacleId: string) {
    // Remove the obstacle from the canvas
    obstacle.destroy();
    this.deselectObstacle()
    this.obstacleService.removeObstacle(obstacleId);
  }

  // Set the selected shape
  onShapeSelected(shape: string) {
    this.selectedShape = shape;
    this.notificationService.open(`Shape selected: ${shape}`);
  }
}