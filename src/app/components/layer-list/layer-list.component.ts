import { Component, Input, Output, EventEmitter } from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'app-layer-list',
  templateUrl: './layer-list.component.html',
  styleUrls: ['./layer-list.component.scss']
})
export class LayerListComponent {
  @Input() layers: { name: string; label:string, layer: Konva.Layer; isTop: boolean }[] = [];
  @Output() moveLayerToTop = new EventEmitter<Konva.Layer>();
  @Output() toggleVisibility = new EventEmitter<Konva.Layer>();

  onMoveLayerToTop(layer: Konva.Layer) {
    this.moveLayerToTop.emit(layer);
  }

  onToggleVisibility(layer: Konva.Layer) {
    this.toggleVisibility.emit(layer);
  }
}