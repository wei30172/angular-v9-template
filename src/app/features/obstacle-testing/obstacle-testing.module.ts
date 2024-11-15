import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObstacleComponentsModule } from 'src/app/components/obstacle-components.module';

import { ObstacleEditorComponent } from './obstacle-editor.component';
import { KonvaObstacleComponent } from './konva-obstacle.component';
import { Obstacle3DComponent } from './obstacle-3d.component';

@NgModule({
  declarations: [
    ObstacleEditorComponent,
    KonvaObstacleComponent,
    Obstacle3DComponent,
  ],
  imports: [
    CommonModule,
    ObstacleComponentsModule,
  ],
  exports: [
    ObstacleEditorComponent,
    KonvaObstacleComponent,
    Obstacle3DComponent,
  ]
})
export class ObstacleTestingModule { }