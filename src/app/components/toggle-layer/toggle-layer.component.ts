import { Component, EventEmitter, Input, Output } from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'app-toggle-layer',
  templateUrl: './toggle-layer.component.html',
  styleUrls: ['./toggle-layer.component.scss']
})
export class ToggleLayerComponent {
  @Input() label: string;
  @Input() layer: Konva.Layer;
  @Output() toggleVisibility = new EventEmitter<Konva.Layer>();

  onToggleVisibility(layer: Konva.Layer) {
    this.toggleVisibility.emit(layer);
  }
}