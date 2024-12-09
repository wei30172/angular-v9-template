import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const TooltipDefaults = {
  offset: 10,
  position: 'bottom' as PositionType,
  theme: 'dark' as ThemeType,
  throttleDelay: 50,
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

interface PositionInfo {
  top: number;
  left: number;
  alternate: PositionType;
}

type Positions = {
  [key in PositionType]: PositionInfo;
};

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
  ) {
    // Get the position and size of the target and container
    const {
      containerRect,
      targetTop,
      targetLeft,
      width,
      height
    } = this.getTargetAndContainerPositions(targetBounds, container);
  
    // Get possible positions for the Tooltip
    const positions = this.getTooltipPositions(targetTop, targetLeft, width, height, offset);

    // Choose the best position
    const finalPosition = this.getBestPosition(
      position,
      positions,
      containerRect,
      targetTop,
      targetLeft,
      width,
      height
    );

    const chosenPosition = positions[finalPosition];
  
    // Adjust the position to stay within the container
    const adjustedPosition = this.adjustPositionWithinContainer(chosenPosition, containerRect);
  
    // Return the final Tooltip position style
    return adjustedPosition;
  }

  // Recalculate the tooltip position with updated dimensions
  updateTooltipPosition() {
    const tooltipData = this.tooltipSubject.getValue();
    if (tooltipData) {
      const updatedStyle = this.calculatePosition(
        tooltipData.targetBounds,
        tooltipData.container,
        TooltipDefaults.offset,
        TooltipDefaults.position
      );

      this.tooltipSubject.next({
        ...tooltipData,
        style: updatedStyle
      });
    }
  }

  // Get the position and size of the target and container
  private getTargetAndContainerPositions(
    targetBounds: TargetBounds,
    container: HTMLElement | HTMLCanvasElement
  ) {
    // Get container boundaries to calculate tooltip placement
    const containerRect = container.getBoundingClientRect();
    const { x = 0, y = 0, width = 0, height = 0 } = targetBounds;
  
    // Calculate the absolute position of the target in the container
    const targetTop = y + containerRect.top;
    const targetLeft = x + containerRect.left;
  
    return {
      containerRect,
      targetTop,
      targetLeft,
      width,
      height
    };
  }

  // Get possible positions for the Tooltip
  private getTooltipPositions(
    targetTop: number,
    targetLeft: number,
    width: number,
    height: number,
    offset: number
  ): Positions {
    return {
      // Define positions for tooltip
      top: {
        top: targetTop - this.tooltipHeight - offset,
        left: targetLeft + width / 2 - this.tooltipWidth / 2,
        alternate: 'bottom',
      },
      bottom: {
        top: targetTop + height + offset,
        left: targetLeft + width / 2 - this.tooltipWidth / 2,
        alternate: 'top',
      },
      left: {
        top: targetTop + height / 2 - this.tooltipHeight / 2,
        left: targetLeft - this.tooltipWidth - offset,
        alternate: 'right',
      },
      right: {
        top: targetTop + height / 2 - this.tooltipHeight / 2,
        left: targetLeft + width + offset,
        alternate: 'left',
      },
    };
  }

  // Choose the best position
  private getBestPosition(
    position: PositionType,
    positions: Positions,
    containerRect: DOMRect,
    targetTop: number,
    targetLeft: number,
    width: number,
    height: number
  ): PositionType {
    const isPositionOutOfBounds = (pos: PositionType) =>
      this.isOutOfBounds(pos, positions, containerRect);
    const isPositionOverlappingTarget = (pos: PositionType) =>
      this.isOverlappingTarget(positions[pos], targetTop, targetLeft, width, height);
  
    // Choose the best position based on bounds
    let finalPosition = position;
    if (isPositionOutOfBounds(position) || isPositionOverlappingTarget(position)) {
      finalPosition = positions[position].alternate as PositionType;

      if (isPositionOutOfBounds(finalPosition) || isPositionOverlappingTarget(finalPosition)) {
        const alternativePositions: PositionType[] = ['top', 'bottom', 'left', 'right'];
        
        for (const pos of alternativePositions) {
          if (!isPositionOutOfBounds(pos) && !isPositionOverlappingTarget(pos)) {
            finalPosition = pos;
            break;
          }
        }
      }
    }
    return finalPosition;
  }

  // Check if the tooltip position is outside the container bounds
  private isOutOfBounds(
    pos: PositionType,
    positions: Positions,
    containerRect: DOMRect
  ): boolean {
    const { top, left } = positions[pos];
    return (
      (pos === 'top' && top < containerRect.top) ||
      (pos === 'bottom' && top + this.tooltipHeight > containerRect.bottom) ||
      (pos === 'left' && left < containerRect.left) ||
      (pos === 'right' && left + this.tooltipWidth > containerRect.right)
    );
  }

  // Detect whether the tooltip will overwrite the target element
  private isOverlappingTarget(
    pos: { top: number; left: number },
    targetTop: number,
    targetLeft: number,
    width: number,
    height: number
  ): boolean {
    const tooltipRect = {
      top: pos.top,
      left: pos.left,
      bottom: pos.top + this.tooltipHeight,
      right: pos.left + this.tooltipWidth,
    };
  
    const targetRect = {
      top: targetTop,
      left: targetLeft,
      bottom: targetTop + height,
      right: targetLeft + width,
    };
  
    return !(
      tooltipRect.right <= targetRect.left ||
      tooltipRect.left >= targetRect.right ||
      tooltipRect.bottom <= targetRect.top ||
      tooltipRect.top >= targetRect.bottom
    );
  }
  
  // Adjust the position to stay within the container
  private adjustPositionWithinContainer(
    position: { top: number; left: number },
    containerRect: DOMRect
  ): { top: string; left: string } {
    // Adjust position to keep tooltip within container
    const adjustedLeft = Math.max(
      containerRect.left,
      Math.min(position.left, containerRect.right - this.tooltipWidth)
    ) + 'px';
  
    const adjustedTop = Math.max(
      containerRect.top,
      Math.min(position.top, containerRect.bottom - this.tooltipHeight)
    ) + 'px';
  
    return { top: adjustedTop, left: adjustedLeft };
  }
}