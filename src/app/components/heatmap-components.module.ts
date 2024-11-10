import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayerListComponent } from 'src/app/components/layer-list/layer-list.component';
import { ToggleLayerComponent } from 'src/app/components/toggle-layer/toggle-layer.component';

@NgModule({
  declarations: [
    LayerListComponent,
    ToggleLayerComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    LayerListComponent,
    ToggleLayerComponent,
  ]
})
export class HeatmapComponentsModule { }