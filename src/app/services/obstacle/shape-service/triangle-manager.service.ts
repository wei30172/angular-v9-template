import { Injectable } from '@angular/core';
import Konva from 'konva';
import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle//obstacle-form.service';
import { ShapeManager } from './obstacle-shape-manager';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { ObstacleType, TriangleObstacle } from 'src/app/models/obstacle.model';

@Injectable({
  providedIn: 'root',
})
export class TriangleManagerService implements ShapeManager<Konva.Line, TriangleObstacle> {
  constructor(
    private obstacleGenerationService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
  ) {}

  create(config: Partial<TriangleObstacle>, draggable: boolean = true): Konva.Line {
    const base = config.base || 100;
    const height = config.height || 100;

    // Define triangle points (centered on x, y)
    const points = [
      0, -height / 2, // Top vertex
      -base / 2, height / 2, // Bottom-left vertex
      base / 2, height / 2, // Bottom-right vertex
    ];

    const triangle = new Konva.Line({
      x: config.x || 0,
      y: config.y || 0,
      points,
      fill: config.color || '#000000',
      closed: true,
      rotation: config.rotation || 0,
      draggable,
    });

    triangle.setAttrs({
      id: config.id,
      shapeType: ObstacleType.Triangle,
      zHeight: config.zHeight || ObstacleSettings.DefaultZHeight,
      startHeight: config.startHeight || 0,
    });

    return triangle;
  }

  update(shape: Konva.Line, values: Partial<TriangleObstacle>): void {
    const base = values.base !== undefined ? parseFloat(values.base.toFixed(2)) : Math.abs(shape.points()[4] - shape.points()[2]);
    const height = values.height !== undefined ? parseFloat(values.height.toFixed(2)) : Math.abs(shape.points()[1] - shape.points()[5]);

    // Define triangle points (centered on x, y)
    const points = [
      0, -height / 2, // Top vertex
      -base / 2, height / 2, // Bottom-left vertex
      base / 2, height / 2, // Bottom-right vertex
    ];

    shape.setAttrs({
      points,
      x: values.x !== undefined ? parseFloat(values.x.toFixed(2)) : shape.x(),
      y: values.y !== undefined ? parseFloat(values.y.toFixed(2)) : shape.y(),
      rotation: values.rotation !== undefined ? parseFloat(values.rotation.toFixed(2)) : shape.rotation(),
      fill: values.color ?? shape.fill(),
    });
  }

  delete(shape: Konva.Line): void {
    shape.destroy();
  }

  move(shape: Konva.Line, offsetX: number, offsetY: number): void {
    const newX = parseFloat((shape.x() + offsetX).toFixed(2));
    const newY = parseFloat((shape.y() + offsetY).toFixed(2));
    shape.position({ x: newX, y: newY });
  }

  scale(shape: Konva.Line, scaleX: number, scaleY: number): void {
    const points = shape.points();
    const scaledPoints = points.map((value, index) =>
      parseFloat((index % 2 === 0 ? value * scaleX : value * scaleY).toFixed(2))
    );
    shape.setAttrs({
      points: scaledPoints,
      scaleX: 1, // Reset scaleX to avoid compounding
      scaleY: 1, // Reset scaleY to avoid compounding
    });
  }

  rotate(shape: Konva.Line, angle: number): void {
    const newRotation = parseFloat(((shape.rotation() + angle) % 360).toFixed(2));
    shape.rotation(newRotation);
  }

  transform(
    shape: Konva.Line,
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

  resize(shape: Konva.Line, distanceX: number, distanceY: number): void {
    shape.points([
      0, parseFloat((-distanceY / 2).toFixed(2)),
      parseFloat((-distanceX / 2).toFixed(2)), parseFloat((distanceY / 2).toFixed(2)),
      parseFloat((distanceX / 2).toFixed(2)), parseFloat((distanceY / 2).toFixed(2)),
    ]);
  }

  calculateBoundingBox(shape: Konva.Line): { x: number; y: number; width: number; height: number } {
    const points = shape.points();
    const width = Math.abs(points[2] - points[0]);
    const height = Math.abs(points[1] - points[5]);

    return {
      x: shape.x(),
      y: shape.y(),
      width,
      height,
    };
  }
  
  addObstacleData(shape: Konva.Line): void {
    const obstacleData = this.copyObstacleData(shape);
    this.obstacleGenerationService.addObstacle(obstacleData as TriangleObstacle);
  }
  
  updateObstacleData(shape: Konva.Line): void {
    const obstacleId = shape.getAttr('id');
    const points = shape.points();
    const base = Math.abs(points[4] - points[2]);
    const height = Math.abs(points[1] - points[5]);
    this.obstacleGenerationService.updateObstacle(obstacleId, {
      x: shape.x(),
      y: shape.y(),
      base,
      height,
      rotation: shape.rotation(),
      color: shape.fill() as string,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    });
  }

  copyObstacleData(shape: Konva.Line): Partial<TriangleObstacle> {
    const points = shape.points();
    return {
      id: shape.getAttr('id'),
      x: shape.x(),
      y: shape.y(),
      base: Math.abs(points[4] - points[2]),
      height: Math.abs(points[1] - points[5]),
      rotation: shape.rotation(),
      color: shape.fill() as string,
      shapeType: ObstacleType.Triangle,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    };
  }

  patchFormValue(shape: Konva.Line): void {
    const data = this.copyObstacleData(shape);
    this.obstacleFormService.updateFormValues(data);
  }

  calculateOffsetPosition(
    values: Partial<TriangleObstacle>,
    offsetX: number,
    offsetY: number,
    stageWidth: number,
    stageHeight: number
  ): { newX: number; newY: number } {
    let newX = values.x + offsetX;
    let newY = values.y + offsetY;

    if (newX + values.base > stageWidth) {
      newX = stageWidth - values.base;
    }
    if (newY + values.height > stageHeight) {
      newY = stageHeight - values.height;
    }

    return { newX, newY };
  }

  updateFromForm(shape: Konva.Line, values: Partial<TriangleObstacle>): void {
    // != null => If value is not null or undefined, use it
    const points = shape.points();
    const oldBase = Math.abs(points[4] - points[2]);
    const oldHeight = Math.abs(points[1] - points[5]);

    const base = values.base != null ? Number(values.base) : oldBase;
    const height = values.height != null ? Number(values.height) : oldHeight;

    // Calculate old and new center offsets
    const oldCenterX = shape.x();
    const oldCenterY = shape.y() - oldHeight / 2;

    const newCenterX = shape.x();
    const newCenterY = shape.y() - height / 2;

    // Update the shape
    shape.setAttrs({
      x: values.x != null ? Number(values.x) + (oldCenterX - newCenterX) : shape.x(),
      y: values.y != null ? Number(values.y) + (oldCenterY - newCenterY) : shape.y(),
      rotation: values.rotation != null ? Number(values.rotation) : shape.rotation(),
      fill: values.color ?? shape.fill(),
      points: [
        0, -height / 2,
        -base / 2, height / 2,
        base / 2, height / 2,
      ],
    });
  }
}
