import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { KonvaCanvasService } from '../obstacle-testing/konva-canvas.service';

const TooltipDefaults = {
  offset: 10,
  position: 'bottom' as PositionType,
  theme: 'dark' as ThemeType,
  throttleDelay: 100,
  scale: 1,
  pan: 0
};

export interface TargetBounds {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type PositionType = 'top' | 'bottom' | 'left' | 'right'
export type ThemeType = 'light' | 'dark' | 'custom' | 'success' | 'warning' | 'error' | 'info'

interface TooltipConfig {
  title: string;
  description?: string | Array<string | Record<string, unknown>> | Record<string, unknown>;
  targetBounds: TargetBounds
  container: HTMLElement | HTMLCanvasElement;
  offset?: number;
  position?: PositionType;
  theme?: ThemeType;
  throttleDelay?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TooltipService {
  constructor(private konvaCanvasService: KonvaCanvasService) {}
  
  // BehaviorSubject to manage tooltip data
  private tooltipSubject = new BehaviorSubject<{
    title: string;
    description?: string | Array<string | Record<string, unknown>> | Record<string, unknown>;
    style: { top: string; left: string };
    theme?: ThemeType;
    targetBounds: TargetBounds;
    container: HTMLElement | HTMLCanvasElement;
  } | null>(null);

  private isPinnedSubject = new BehaviorSubject<boolean>(false);

  // Observable for tooltip updates
  tooltip$ = this.tooltipSubject.asObservable();
  isPinned$ = this.isPinnedSubject.asObservable();

  // Throttle flag to control frequency of showTooltip execution
  private isThrottling = false;

  private tooltipHeight = 36; // Default height
  private tooltipWidth = 150; // Default width

  setIsPinned(isPinned: boolean) {
    this.isPinnedSubject.next(isPinned);
  }

  setTooltipDimensions(width: number, height: number) {
    this.tooltipWidth = width;
    this.tooltipHeight = height;
  }

  // Display the tooltip
  showTooltip(config: TooltipConfig) {
    const {
      title,
      description,
      targetBounds,
      container,
      offset = TooltipDefaults.offset,
      position = TooltipDefaults.position,
      theme = TooltipDefaults.theme,
      throttleDelay = TooltipDefaults.throttleDelay,
    } = config;
    
    // Get canvas state
    const { scale, panX, panY } = this.konvaCanvasService.getCanvasState();

    // Skip execution if throttling is active
    if (this.isThrottling) return;

    // Set throttle flag and clear it after the delay
    this.isThrottling = true;
    setTimeout(() => (this.isThrottling = false), throttleDelay);
    
    const tooltipPosition = this.calculatePosition(
      targetBounds,
      container,
      offset,
      position,
      scale,
      panX,
      panY
    );
    
    this.tooltipSubject.next({
      title,
      description,
      style: tooltipPosition,
      theme,
      targetBounds,
      container
    });
  }

  // Update tooltip position
  updateTooltipPosition() {
    const currentTooltip = this.tooltipSubject.getValue();
    if (!currentTooltip) return;

    const { targetBounds, container } = currentTooltip as TooltipConfig;
    if (!targetBounds || !container) return;

    // Get canvas state
    const { scale, panX, panY } = this.konvaCanvasService.getCanvasState();

    const newPosition = this.calculatePosition(
      targetBounds,
      container,
      TooltipDefaults.offset, // Default offset
      TooltipDefaults.position, // Default position
      scale,
      panX,
      panY
    );

    // Update the position in the current tooltip data
    this.tooltipSubject.next({
      ...currentTooltip,
      style: newPosition,
    });
  }
  
  // Hide the tooltip
  hideTooltip() {
    this.isPinnedSubject.getValue() ? null : this.tooltipSubject.next(null);
  }

  // Reset the subjects and properties
  destroyTooltip() {
    this.tooltipSubject.next(null);
    this.isPinnedSubject.next(false);
    this.isThrottling = false;
  }

  // Calculate tooltip position
  private calculatePosition(
    targetBounds: TargetBounds,
    container: HTMLElement | HTMLCanvasElement,
    offset: number,
    position: 'top' | 'bottom' | 'left' | 'right',
    scale: number = TooltipDefaults.scale,
    panX: number = TooltipDefaults.pan,
    panY: number = TooltipDefaults.pan
  ) {
    // Get container boundaries to calculate tooltip placement
    const containerRect = container.getBoundingClientRect();
    const { x = 0, y = 0, width = 0, height = 0 } = targetBounds;
  
    // Adjust obstacle's position and size by scale and pan
    const scaledX = x * scale + panX;
    const scaledY = y * scale + panY;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    // Calculate obstacle's absolute position on the container
    const obstacleTop = scaledY + containerRect.top;
    const obstacleLeft = scaledX + containerRect.left;
  
    // Define tooltip positions for each direction with fallback options
    const positions = {
      top: { top: obstacleTop - this.tooltipHeight - offset, left: obstacleLeft, alternate: 'bottom' },
      bottom: { top: obstacleTop + scaledHeight + offset, left: obstacleLeft, alternate: 'top' },
      left: { top: obstacleTop + scaledHeight / 2 - this.tooltipHeight / 2, left: obstacleLeft - this.tooltipWidth - offset, alternate: 'right' },
      right: { top: obstacleTop + scaledHeight / 2 - this.tooltipHeight / 2, left: obstacleLeft + scaledWidth + offset, alternate: 'left' }
    };
    
    // Check if the position is out of container bounds
    const isOutOfBounds = (pos: 'top' | 'bottom' | 'left' | 'right') => {
      const { top, left } = positions[pos];
      return (pos === 'top' && top < containerRect.top) ||
             (pos === 'bottom' && top + this.tooltipHeight > containerRect.bottom) ||
             (pos === 'left' && left < containerRect.left) ||
             (pos === 'right' && left + this.tooltipWidth > containerRect.right);
    };

    // Determine the best position by checking boundaries
    const finalPosition = isOutOfBounds(position) ? positions[position].alternate : position;
    const chosenPosition = positions[finalPosition];

    // Adjust top and left values to stay within container bounds
    const adjustedLeft = Math.max(
      containerRect.left, 
      Math.min(chosenPosition.left, containerRect.right - this.tooltipWidth)
    ) + 'px';
  
    const adjustedTop = Math.max(
      containerRect.top, 
      Math.min(chosenPosition.top, containerRect.bottom - this.tooltipHeight)
    ) + 'px';

    // Return final tooltip position style
    return { top: adjustedTop, left: adjustedLeft };
  }
}