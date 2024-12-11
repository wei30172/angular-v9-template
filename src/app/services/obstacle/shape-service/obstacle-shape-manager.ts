import { Injectable } from '@angular/core';
import Konva from "konva";
import { RectangleManagerService } from './rectangle-manager.service';
import { EllipseManagerService } from './ellipse-manager.service';
import { TriangleManagerService } from './triangle-manager.service';
import { TrapezoidManagerService } from './trapezoid-manager.service';
import {
  ObstacleType,
  BaseObstacle,
  RectangleObstacle,
  EllipseObstacle,
  TriangleObstacle,
  TrapezoidObstacle
} from 'src/app/models/obstacle.model';

// Define mapping between obstacle types, shapes, and configurations
export type ShapeMapping = {
  [ObstacleType.Rectangle]: {
    shape: Konva.Rect;
    config: RectangleObstacle;
  };
  [ObstacleType.Ellipse]: {
    shape: Konva.Ellipse;
    config: EllipseObstacle;
  };
  [ObstacleType.Triangle]: {
    shape: Konva.Line;
    config: TriangleObstacle;
  };
  [ObstacleType.Trapezoid]: {
    shape: Konva.Line;
    config: TrapezoidObstacle;
  };
};

export interface ShapeManager<T extends Konva.Shape, U extends BaseObstacle> {
  create(config: Partial<U>, draggable?: boolean): T; // Create a shape with given config
  update(shape: T, values: Partial<U>): void; // Update shape properties
  delete(shape: T): void; // Delete the shape
  move(shape: T, offsetX: number, offsetY: number): void; // Move the shape by an offset
  scale(shape: T, scaleX: number, scaleY: number): void; // Scale the shape
  rotate(shape: T, angle: number): void; // Rotate the shape by a given angle
  transform(shape: T, options: { scaleX?: number; scaleY?: number; rotate?: number }): void; // Transform the shape with options
  resize(shape: T, distanceX: number, distanceY: number): void; // Resize the shape
  calculateBoundingBox(shape: T): { x: number; y: number; width: number; height: number }; // Get the bounding box of the shape
  addObstacleData(shape: T): void; // Add a new shape obstacle
  updateObstacleData(shape: T): void; // Update obstacle data from the shape
  checkOverlap(obstacle: U): boolean; // Checks if the shape overlaps with existing obstacles
  copyObstacleData(shape: T): U; // Copy obstacle data for cloning
  patchFormValue(shape: T): void; // Patch form values from the shape
  calculateOffsetPosition(
    values: Partial<U>,
    offsetX: number,
    offsetY: number,
    stageWidth: number,
    stageHeight: number
  ): { newX: number; newY: number }; // Calculate new position after applying offset
  updateFromForm(shape: T, values: Partial<U>): void; // Apply the updated form values
}


@Injectable({
  providedIn: 'root',
})
export class ObstacleShapeManager {
  private shapeManagers: {
    [key in ObstacleType]: ShapeManager<ShapeMapping[key]['shape'], ShapeMapping[key]['config']>;
  };

  constructor(
    rectangleManagerService: RectangleManagerService,
    ellipseManagerService: EllipseManagerService,
    triangleManagerService: TriangleManagerService,
    trapezoidManagerServicee: TrapezoidManagerService,
  ) {
    this.shapeManagers = {
      [ObstacleType.Rectangle]: rectangleManagerService,
      [ObstacleType.Ellipse]: ellipseManagerService,
      [ObstacleType.Triangle]: triangleManagerService,
      [ObstacleType.Trapezoid]: trapezoidManagerServicee,
    };
  }

  // Get shape manager for a specific obstacle type
  getShapeManagerByType<T extends ObstacleType>(
    shapeType: T
  ): ShapeManager<ShapeMapping[T]['shape'], ShapeMapping[T]['config']> | null {
    const manager = this.shapeManagers[shapeType];
    return manager || null;
  }

  // Retrieve the manager and shape instance based on a Konva shape
  getShapeAndManager<T extends keyof ShapeMapping>(
    obstacle: Konva.Shape | null
  ): { manager: ShapeManager<ShapeMapping[T]['shape'], ShapeMapping[T]['config']>; shape?: ShapeMapping[T]['shape'] } | null {
    if (!obstacle) return null;
  
    const shapeType = obstacle.getAttr('shapeType') as T;
    if (!shapeType || !this.shapeManagers[shapeType]) return null;
  
    const manager = this.shapeManagers[shapeType];
    return {
      manager: manager as ShapeManager<ShapeMapping[T]['shape'], ShapeMapping[T]['config']>,
      shape: obstacle as ShapeMapping[T]['shape'],
    };
  }

  // Calculate the bounding box of the shape
  getShapeBounds(shape: Konva.Shape): { x: number; y: number; width: number; height: number } {
    const rect = shape.getClientRect();

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    return {
      x: rect.x + scrollX,
      y: rect.y + scrollY,
      width: rect.width,
      height: rect.height,
    };
  }
}