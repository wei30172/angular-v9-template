import { Injectable } from '@angular/core';
import Konva from 'konva';
import { ObstacleSettings, ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';
import { ShapeManager } from './obstacle-shape-manager';
import { ObstacleType, EllipseObstacle } from 'src/app/models/obstacle.model';

@Injectable({
  providedIn: 'root',
})
export class EllipseManagerService implements ShapeManager<Konva.Ellipse, EllipseObstacle> {
  constructor(
    private obstacleGenerationService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
  ) {}

  create(config: Partial<EllipseObstacle>, draggable: boolean = true): Konva.Ellipse {
    const ellipse = new Konva.Ellipse({
      x: config.x || 0,
      y: config.y || 0,
      radiusX: config.radiusX || 50,
      radiusY: config.radiusY || 50,
      fill: config.color || '#000000',
      rotation: config.rotation || 0,
      draggable,
    });

    ellipse.setAttrs({
      id: config.id,
      shapeType: ObstacleType.Ellipse,
      zHeight: config.zHeight || ObstacleSettings.DefaultZHeight,
      startHeight: config.startHeight || 0,
    });

    return ellipse;
  }

  update(shape: Konva.Ellipse, values: Partial<EllipseObstacle>): void {
    shape.setAttrs({
      x: values.x !== undefined ? Math.floor(values.x) : shape.x(),
      y: values.y !== undefined ? Math.floor(values.y) : shape.y(),
      radiusX: values.radiusX !== undefined ? parseFloat(values.radiusX.toFixed(2)) : shape.radiusX(),
      radiusY: values.radiusY !== undefined ? parseFloat(values.radiusY.toFixed(2)) : shape.radiusY(),
      rotation: values.rotation !== undefined ? parseFloat(values.rotation.toFixed(2)) : shape.rotation(),
      fill: values.color ?? shape.fill(),
    });
  }

  delete(shape: Konva.Ellipse): void {
    shape.destroy();
  }

  move(shape: Konva.Ellipse, offsetX: number, offsetY: number): void {
    const newX = parseFloat((shape.x() + offsetX).toFixed(2));
    const newY = parseFloat((shape.y() + offsetY).toFixed(2));
    shape.position({ x: newX, y: newY });
  }

  scale(shape: Konva.Ellipse, scaleX: number, scaleY: number): void {
    const newRadiusX = parseFloat((shape.radiusX() * scaleX).toFixed(2));
    const newRadiusY = parseFloat((shape.radiusY() * scaleY).toFixed(2));

    shape.setAttrs({
      radiusX: newRadiusX,
      radiusY: newRadiusY,
      scaleX: 1, // Reset scaleX to avoid compounding
      scaleY: 1, // Reset scaleY to avoid compounding
    });
  }

  rotate(shape: Konva.Ellipse, angle: number): void {
    const newRotation = parseFloat(((shape.rotation() + angle) % 360).toFixed(2));
    shape.rotation(newRotation);
  }

  transform(
    shape: Konva.Ellipse,
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

  resize(shape: Konva.Ellipse, distanceX: number, distanceY: number): void {
    shape.radiusX(parseFloat((distanceX / 2).toFixed(2)));
    shape.radiusY(parseFloat((distanceY / 2).toFixed(2)));
  }

  calculateBoundingBox(shape: Konva.Ellipse): { x: number; y: number; width: number; height: number } {
    return {
      x: shape.x(),
      y: shape.y(),
      width: shape.radiusX() * 2,
      height: shape.radiusY() * 2,
    };
  }

  addObstacleData(shape: Konva.Ellipse): void {
    const obstacleData = this.copyObstacleData(shape);
    this.obstacleGenerationService.addObstacle(obstacleData as EllipseObstacle);
  }

  updateObstacleData(shape: Konva.Ellipse): void {
    const obstacleId = shape.getAttr('id');
    this.obstacleGenerationService.updateObstacle(obstacleId, {
      x: shape.x(),
      y: shape.y(),
      radiusX: shape.radiusX(),
      radiusY: shape.radiusY(),
      rotation: shape.rotation(),
      color: shape.fill() as string,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    });
  }

  copyObstacleData(shape: Konva.Ellipse): Partial<EllipseObstacle> {
    return {
      id: shape.getAttr('id'),
      x: shape.x(),
      y: shape.y(),
      radiusX: shape.radiusX(),
      radiusY: shape.radiusY(),
      rotation: shape.rotation(),
      color: shape.fill() as string,
      shapeType: ObstacleType.Ellipse,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    };
  }

  patchFormValue(shape: Konva.Ellipse): void {
    const data = this.copyObstacleData(shape);
    this.obstacleFormService.updateFormValues(data);
  }

  calculateOffsetPosition(
    values: Partial<EllipseObstacle>,
    offsetX: number,
    offsetY: number,
    stageWidth: number,
    stageHeight: number
  ): { newX: number; newY: number } {
    let newX = values.x + offsetX;
    let newY = values.y + offsetY;

    // Consider the ellipse's radius when checking boundaries
    if (newX + values.radiusX > stageWidth) {
      newX = stageWidth - values.radiusX;
    }
    if (newY + values.radiusY > stageHeight) {
      newY = stageHeight - values.radiusY;
    }

    return { newX, newY };
  }

  updateFromForm(shape: Konva.Ellipse, values: Partial<EllipseObstacle>): void {
    // != null => If value is not null or undefined, use it
    shape.setAttrs({
      x: values.x != null ? Number(values.x) : shape.x(),
      y: values.y != null ? Number(values.y) : shape.y(),
      radiusX: values.radiusX != null ? Number(values.radiusX) : shape.radiusX(),
      radiusY: values.radiusY != null ? Number(values.radiusY) : shape.radiusY(),
      rotation: values.rotation != null ? Number(values.rotation) : shape.rotation(),
      fill: values.color ?? shape.fill(),
    });
  }
}
