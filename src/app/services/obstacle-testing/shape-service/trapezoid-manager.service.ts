import { Injectable } from '@angular/core';
import Konva from 'konva';
import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';
import { ShapeManager } from './obstacle-shape-manager';
import { ObstacleSettings } from 'src/app/config/obstacle-settings';
import { ObstacleType, TrapezoidObstacle } from 'src/app/models/obstacle.model';

@Injectable({
  providedIn: 'root',
})
export class TrapezoidManagerService implements ShapeManager<Konva.Line, TrapezoidObstacle> {
  constructor(
    private obstacleGenerationService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
  ) {}

  // Create a new trapezoid with the specified configuration
  create(config: Partial<TrapezoidObstacle>, draggable: boolean = true): Konva.Line {
    const topWidth = config.topWidth || 80;
    const bottomWidth = config.bottomWidth || 120;
    const height = config.height || 100;

    const points = [
      -topWidth / 2, -height / 2, // Top-left vertex
      topWidth / 2, -height / 2, // Top-right vertex
      bottomWidth / 2, height / 2, // Bottom-right vertex
      -bottomWidth / 2, height / 2, // Bottom-left vertex
    ];

    // Define trapezoid points (centered on x, y)
    const trapezoid = new Konva.Line({
      x: config.x || 0,
      y: config.y || 0,
      points,
      fill: config.color || '#000000',
      closed: true,
      rotation: config.rotation || 0,
      draggable,
    });

    trapezoid.setAttrs({
      id: config.id,
      shapeType: ObstacleType.Trapezoid,
      zHeight: config.zHeight || ObstacleSettings.DefaultZHeight,
      startHeight: config.startHeight || 0,
    });

    return trapezoid;
  }

  update(shape: Konva.Line, values: Partial<TrapezoidObstacle>): void {
    const topWidth = values.topWidth !== undefined ? parseFloat(values.topWidth.toFixed(2)) : Math.abs(shape.points()[2] - shape.points()[0]);
    const bottomWidth = values.bottomWidth !== undefined ? parseFloat(values.bottomWidth.toFixed(2)) : Math.abs(shape.points()[6] - shape.points()[4]);
    const height = values.height !== undefined ? parseFloat(values.height.toFixed(2)) : Math.abs(shape.points()[5] - shape.points()[1]);

    // Define trapezoid points (centered on x, y)
    const points = [
      -topWidth / 2, -height / 2, // Top-left vertex
      topWidth / 2, -height / 2, // Top-right vertex
      bottomWidth / 2, height / 2, // Bottom-right vertex
      -bottomWidth / 2, height / 2, // Bottom-left vertex
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
    const topWidth = distanceX * ObstacleSettings.DefaultTopWidthRatio;
    const bottomWidth = distanceX;

    shape.points([
      parseFloat((-topWidth / 2).toFixed(2)), parseFloat((-distanceY / 2).toFixed(2)),
      parseFloat((topWidth / 2).toFixed(2)), parseFloat((-distanceY / 2).toFixed(2)),
      parseFloat((bottomWidth / 2).toFixed(2)), parseFloat((distanceY / 2).toFixed(2)),
      parseFloat((-bottomWidth / 2).toFixed(2)), parseFloat((distanceY / 2).toFixed(2)),
    ]);
  }
  
  calculateBoundingBox(shape: Konva.Line): { x: number; y: number; width: number; height: number } {
    const points = shape.points();
    const topWidth = Math.abs(points[2] - points[0]);
    const bottomWidth = Math.abs(points[6] - points[4]);
    const height = Math.abs(points[1] - points[5]);
    const width = Math.max(topWidth, bottomWidth);

    return {
      x: shape.x(),
      y: shape.y(),
      width,
      height,
    };
  }

  addObstacleData(shape: Konva.Line): void {
    const obstacleData = this.copyObstacleData(shape);
    this.obstacleGenerationService.addObstacle(obstacleData as TrapezoidObstacle);
  }

  updateObstacleData(shape: Konva.Line): void {
    const obstacleId = shape.getAttr('id');
    const points = shape.points();
    const topWidth = Math.abs(points[2] - points[0]);
    const bottomWidth = Math.abs(points[6] - points[4]);
    const height = Math.abs(points[1] - points[5]);
    this.obstacleGenerationService.updateObstacle(obstacleId, {
      x: shape.x(),
      y: shape.y(),
      topWidth,
      bottomWidth,
      height,
      rotation: shape.rotation(),
      color: shape.fill() as string,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    });
  }

  copyObstacleData(shape: Konva.Line): Partial<TrapezoidObstacle> {
    const points = shape.points();
    return {
      id: shape.getAttr('id'),
      x: shape.x(),
      y: shape.y(),
      topWidth: Math.abs(points[2] - points[0]),
      bottomWidth: Math.abs(points[6] - points[4]),
      height: Math.abs(points[1] - points[5]),
      rotation: shape.rotation(),
      color: shape.fill() as string,
      shapeType: ObstacleType.Trapezoid,
      zHeight: shape.getAttr('zHeight'),
      startHeight: shape.getAttr('startHeight'),
    };
  }

  patchFormValue(shape: Konva.Line): void {
    const data = this.copyObstacleData(shape);
    this.obstacleFormService.updateFormValues(data);
  }

  calculateOffsetPosition(
    values: Partial<TrapezoidObstacle>,
    offsetX: number,
    offsetY: number,
    stageWidth: number,
    stageHeight: number
  ): { newX: number; newY: number } {
    let newX = values.x + offsetX;
    let newY = values.y + offsetY;

    const maxWidth = Math.max(values.topWidth, values.bottomWidth);

    // Consider the bounding box of the trapezoid
    if (newX + maxWidth > stageWidth) {
      newX = stageWidth - maxWidth;
    }
    if (newY + values.height > stageHeight) {
      newY = stageHeight - values.height;
    }

    return { newX, newY };
  }

  // Update trapezoid properties
  updateFromForm(shape: Konva.Line, values: Partial<TrapezoidObstacle>): void {
    // != null => If value is not null or undefined, use it
    const points = shape.points();
    const oldTopWidth = Math.abs(points[2] - points[0]);
    const oldBottomWidth = Math.abs(points[6] - points[4]);
    const oldHeight = Math.abs(points[1] - points[5]);

    const topWidth = values.topWidth != null ? Number(values.topWidth) : oldTopWidth;
    const bottomWidth = values.bottomWidth != null ? Number(values.bottomWidth) : oldBottomWidth;
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
        -topWidth / 2, -height / 2,
        topWidth / 2, -height / 2,
        bottomWidth / 2, height / 2,
        -bottomWidth / 2, height / 2,
      ],
    });
  }
}
