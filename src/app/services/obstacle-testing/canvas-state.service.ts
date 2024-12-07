// Enum to represent the different possible states of the canvas
export enum CanvasState {
  Idle = 'Idle', // No current action
  Drawing = 'Drawing', // Currently drawing a obstacle
  Dragging = 'Dragging', // Currently dragging a obstacle
  Transforming = 'Transforming', // Currently transforming a obstacle
}

// Class to service the current state of the canvas
export class CanvasStateService {
  // Initialize the canvas state to 'Idle'
  private currentState: CanvasState = CanvasState.Idle;

  // Get the current state of the canvas
  getState(): CanvasState {
    return this.currentState;
  }

  // Set a new state for the canvas
  setState(newState: CanvasState): void {
    this.currentState = newState;
  }

  // Check if the canvas is currently in the 'Idle' state
  isIdle(): boolean {
    return this.currentState === CanvasState.Idle;
  }

  // Check if the canvas is currently in the 'Drawing' state
  isDrawing(): boolean {
    return this.currentState === CanvasState.Drawing;
  }

  // Check if the canvas is currently in the 'Dragging' state
  isDragging(): boolean {
    return this.currentState === CanvasState.Dragging;
  }

  // Check if the canvas is currently in the 'Transforming' state
  isTransforming(): boolean {
    return this.currentState === CanvasState.Transforming;
  }
}