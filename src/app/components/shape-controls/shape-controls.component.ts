import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-shape-controls',
  templateUrl: './shape-controls.component.html',
  styleUrls: ['./shape-controls.component.scss']
})
export class ShapeControlsComponent {
  @Input() selectedShape: string
  @Output() shapeSelected = new EventEmitter<string>();

  shapes = [
    { name: 'rectangle', shapeClass: 'rectangle' },
    { name: 'circle', shapeClass: 'ellipse' },
    { name: 'triangle', shapeClass: 'triangle' },
    { name: 'trapezoid', shapeClass: 'trapezoid' }
  ];

  selectShape(shape: string) {
    this.shapeSelected.emit(shape);
  }
}