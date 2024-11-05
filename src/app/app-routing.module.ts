import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KonvaObstacleComponent } from './features/obstacle-testing/konva-obstacle.component';
import { Obstacle3DComponent } from './features/obstacle-testing/obstacle-3d.component';
import { KonvaHeatmapComponent } from './features/heatmap-testing/konva-heatmap.component';
import { PdfTestComponent } from './features/pdf-testing/pdf-test.component';

const routes: Routes = [
  { path: 'konva-obstacle', component: KonvaObstacleComponent },
  { path: 'obstacle-3d', component: Obstacle3DComponent },
  { path: 'konva-heatmap', component: KonvaHeatmapComponent },
  { path: 'pdf-test', component: PdfTestComponent },
  { path: '', redirectTo: '/konva-heatmap', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
