import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayerListComponent } from 'src/app/components/layer-list/layer-list.component';
import { ToggleLayerComponent } from 'src/app/components/toggle-layer/toggle-layer.component';
import { HeatmapGradientComponent } from 'src/app/components/heatmap-indicator/heatmap-indicator.component';

@NgModule({
  declarations: [
    LayerListComponent,
    ToggleLayerComponent,
    HeatmapGradientComponent
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    LayerListComponent,
    ToggleLayerComponent,
    HeatmapGradientComponent
  ]
})
export class HeatmapComponentsModule { }