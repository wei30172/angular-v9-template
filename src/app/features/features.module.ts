import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsModule } from 'src/app/components/components.module';

import { KonvaObstacleComponent } from './konva-obstacle/konva-obstacle.component';
import { BabylonObstacleComponent } from './babylon-obstacle/babylon-obstacle.component';
import { HeatmapObstacleComponent } from './heatmap-obstacle/heatmap-obstacle.component';
import { PdfGenerationComponent } from './pdf-generation/pdf-generation.component';

@NgModule({
  declarations: [
    KonvaObstacleComponent,
    BabylonObstacleComponent,
    HeatmapObstacleComponent,
    PdfGenerationComponent,
  ],
  imports: [
    CommonModule,
    ComponentsModule,
  ],
  exports: [
    KonvaObstacleComponent,
    BabylonObstacleComponent,
    HeatmapObstacleComponent,
    PdfGenerationComponent,
  ]
})
export class FeaturesModule { }