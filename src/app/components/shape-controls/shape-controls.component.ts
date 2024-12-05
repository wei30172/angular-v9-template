import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ObstacleType } from 'src/app/models/obstacle.model';

@Component({
  selector: 'app-shape-controls',
  templateUrl: './shape-controls.component.html',
  styleUrls: ['./shape-controls.component.scss']
})
export class ShapeControlsComponent {
  @Input() currentType: string
  @Output() shapeSelected = new EventEmitter<ObstacleType>();

  shapes = [
    { name: ObstacleType.Rectangle, shapeClass: 'rectangle' },
    { name: ObstacleType.Ellipse, shapeClass: 'ellipse' },
    { name: ObstacleType.Triangle, shapeClass: 'triangle' },
    { name: ObstacleType.Trapezoid, shapeClass: 'trapezoid' }
  ];

  selectShape(shape: ObstacleType) {
    this.shapeSelected.emit(shape);
  }
}