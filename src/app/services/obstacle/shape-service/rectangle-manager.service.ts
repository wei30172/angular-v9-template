import { Injectable } from '@angular/core';
import Konva from 'konva';
import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';
import { ObstacleCollisionService } from 'src/app/services/obstacle/obstacle-collision.service';
import { ObstacleFormService } from 'src/app/services/obstacle//obstacle-form.service';
import { ShapeManager } from './obstacle-shape-manager';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { ObstacleType, RectangleObstacle } from 'src/app/models/obstacle.model';

@Injectable({
  providedIn: 'root',
})
export class RectangleManagerService implements ShapeManager<Konva.Rect, RectangleObstacle> {
  constructor(
    private obstacleGenerationService: ObstacleGenerationService,
    private obstacleCollisionService: ObstacleCollisionService,
    private obstacleFormService: ObstacleFormService,
  ) {}

  create(config: Partial<RectangleObstacle>, draggable: boolean = true): Konva.Rect {
    const rectangle = new Konva.Rect({
      x: config.x || 0,
      y: config.y || 0,
      width: config.width || 100,
      height: config.height || 100,
      fill: config.color || '#000000',
      rotation: config.rotation || 0,
      draggable,
      offsetX: (config.width || 100) / 2, 
      offsetY: (config.height || 100) / 2,
    });

    rectangle.setAttrs({
      id: config.id,
      shapeType: ObstacleType.Rectangle,
      zHeight: config.zHeight || ObstacleSettings.DefaultZHeight,
      startHeight: config.startHeight || 0,
    });

    return rectangle;
  }

  update(shape: Konva.Rect, values: Partial<RectangleObstacle>): void {
    shape.setAttrs({
      x: values.x !== undefined ? parseFloat(values.x.toFixed(2)) : shape.x(),
      y: values.y !== undefined ? parseFloat(values.y.toFixed(2)) : shape.y(),
      width: values.width !== undefined ? parseFloat(values.width.toFixed(2)) : shape.width(),
      height: values.height !== undefined ? parseFloat(values.height.toFixed(2)) : shape.height(),
      rotation: values.rotation !== undefined ? parseFloat(values.rotation.toFixed(2)) : shape.rotation(),
      fill: values.color ?? shape.fill(),
    });
    if (values.width || values.height) {
      this.resetOffset(shape);
    }
  }

  delete(shape: Konva.Rect): void {
    shape.destroy();
  }

  move(shape: Konva.Rect, offsetX: number, offsetY: number): void {
    const newX = parseFloat((shape.x() + offsetX).toFixed(2));
    const newY = parseFloat((shape.y() + offsetY).toFixed(2));
    shape.position({ x: newX, y: newY });
  }

  scale(shape: Konva.Rect, scaleX: number, scaleY: number): void {
    const newWidth = parseFloat((shape.width() * scaleX).toFixed(2));
    const newHeight = parseFloat((shape.height() * scaleY).toFixed(2));

    shape.setAttrs({
      width: newWidth,
      height: newHeight,
      scaleX: 1, // Reset scaleX to avoid compounding
      scaleY: 1, // Reset scaleY to avoid compounding
    });

    this.resetOffset(shape);
  }

  rotate(shape: Konva.Rect, angle: number): void {
    const newRotation = parseFloat(((shape.rotation() + angle) % 360).toFixed(2));
    shape.rotation(newRotation);
  }

  transform(
    shape: Konva.Rect,
    options: { scaleX?: number; scaleY?: number; rotate?: number }
  ): void {
    if (options.scaleX || options.scaleY) {
      this.scale(shape, options.scaleX || 1, options.scaleY || 1);
    }
    if (options.rotate) {
      const newRotation = parseFloat(options.rotate.toFixed(2));
      shape.rotation(newRotation);
    }
  }

  resize(shape: Konva.Rect, distanceX: number, distanceY: number): void {
    const width = parseFloat(distanceX.toFixed(2));
    const height = parseFloat(distanceY.toFixed(2));
    shape.size({ width, height });
    this.resetOffset(shape);
  }

  calculateBoundingBox(shape: Konva.Rect): { x: number; y: number; width: number; height: number } {
    return {
      x: shape.x(),
      y: shape.y(),
      width: shape.width(),
      height: shape.height(),
    };
  }

  addObstacleData(shape: Konva.Rect): void {
    const obstacleData = this.copyObstacleData(shape);
    this.obstacleGenerationService.addObstacle(obstacleData);
  }

  updateObstacleData(shape: Konva.Rect): void {
    const obstacleId = shape.getAttr('id');
    this.obstacleGenerationService.updateObstacle(obstacleId, {
      x: shape.x(),
      y: shape.y(),
      width: shape.width(),
      height: shape.height(),
      rotation: shape.rotation(),
      color: shape.fill() as string,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    });
  }

  checkOverlap(obstacle: RectangleObstacle): boolean {
    return this.obstacleCollisionService.checkOverlapAndBounds(obstacle);
  }

  copyObstacleData(shape: Konva.Rect): RectangleObstacle {
    return {
      id: shape.getAttr('id'),
      x: shape.x(),
      y: shape.y(),
      width: shape.width(),
      height: shape.height(),
      rotation: shape.rotation(),
      color: shape.fill() as string,
      shapeType: ObstacleType.Rectangle,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    };
  }
  
  patchFormValue(shape: Konva.Rect): void {
    const obstacleData = this.copyObstacleData(shape);
    this.obstacleFormService.updateFormValues(obstacleData);
  }

  calculateOffsetPosition(
    values: Partial<RectangleObstacle>,
    offsetX: number,
    offsetY: number,
    stageWidth: number,
    stageHeight: number
  ): { newX: number; newY: number } {
    let newX = values.x + offsetX;
    let newY = values.y + offsetY;

    // Ensure the rectangle remains within the canvas boundaries
    if (newX + values.width > stageWidth) {
      newX = stageWidth - values.width;
    }
    if (newY + values.height > stageHeight) {
      newY = stageHeight - values.height;
    }

    return { newX, newY };
  }

  updateFromForm(shape: Konva.Rect, values: Partial<RectangleObstacle>): void {
    // != null => If value is not null or undefined, use it
    shape.setAttrs({
      x: values.x != null ? Number(values.x) : shape.x(),
      y: values.y != null ? Number(values.y) : shape.y(),
      width: values.width != null ? Number(values.width) : shape.width(),
      height: values.height != null ? Number(values.height) : shape.height(),
      rotation: values.rotation != null ? Number(values.rotation) : shape.rotation(),
      fill: values.color ?? shape.fill(),
    });

    this.resetOffset(shape);
  }

  private resetOffset(shape: Konva.Rect): void {
    shape.setAttrs({
      offsetX: shape.width() / 2,
      offsetY: shape.height() / 2,
    });
  }
}