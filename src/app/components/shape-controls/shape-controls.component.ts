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
    { name: 'rectangle', symbol: '■' },
    { name: 'circle', symbol: '●' },
    { name: 'triangle', symbol: '▲' },
    { name: 'trapezoid', symbol: '⏢' }
  ];

  selectShape(shape: string) {
    this.shapeSelected.emit(shape);
  }
}