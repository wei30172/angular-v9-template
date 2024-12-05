import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Obstacle, ObstacleType } from 'src/app/models/obstacle.model';

@Component({
  selector: 'app-obstacle-list',
  templateUrl: './obstacle-list.component.html',
  styleUrls: ['./obstacle-list.component.scss']
})
export class ObstacleListComponent {
  @Input() obstacleList: Obstacle[] = [];
  @Output() selectObstacle = new EventEmitter<string>();
  @Output() deleteObstacle = new EventEmitter<string>();

  ObstacleType = ObstacleType;
  
  onSelectObstacle(id: string) {
    this.selectObstacle.emit(id);
  }

  onDeleteObstacle(id: string) {
    this.deleteObstacle.emit(id);
  }
}