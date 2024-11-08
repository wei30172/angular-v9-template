import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-delete-icon',
  templateUrl: './delete-icon.component.html',
  styleUrls: ['./delete-icon.component.scss']
})
export class DeleteIconComponent {
  @Input() deleteIconStyle = {};
  @Input() obstacleId: string;
  @Output() deleteObstacle = new EventEmitter<string>();

  onDelete() {
    this.deleteObstacle.emit(this.obstacleId);
  }
}