import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObstacleComponentsModule } from 'src/app/components/obstacle-components.module';
import { HeatmapComponentsModule } from 'src/app/components/heatmap-components.module';

import { KonvaHeatmapComponent } from './konva-heatmap.component';

@NgModule({
  declarations: [
    KonvaHeatmapComponent,
  ],
  imports: [
    CommonModule,
    ObstacleComponentsModule,
    HeatmapComponentsModule
  ],
  exports: [
    KonvaHeatmapComponent,
  ]
})
export class HeatmapTestingModule { }