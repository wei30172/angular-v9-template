import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KonvaObstacleComponent } from './features/konva-obstacle/konva-obstacle.component';
import { BabylonObstacleComponent } from './features/babylon-obstacle/babylon-obstacle.component';
import { HeatmapObstacleComponent } from './features/heatmap-obstacle/heatmap-obstacle.component';
import { PdfGenerationComponent } from './features/pdf-generation/pdf-generation.component';

const routes: Routes = [
  { path: 'konva-obstacle', component: KonvaObstacleComponent },
  { path: 'babylon-obstacle', component: BabylonObstacleComponent },
  { path: 'heatmap-obstacle', component: HeatmapObstacleComponent },
  { path: 'pdf-generation', component: PdfGenerationComponent },
  { path: '', redirectTo: '/obstacle-preview', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
