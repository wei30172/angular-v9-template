import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ObstacleType } from 'src/app/models/obstacle.model';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';

@Component({
  selector: 'app-edit-form',
  templateUrl: './edit-form.component.html',
  styleUrls: ['./edit-form.component.scss']
})
export class EditFormComponent {
  @Input() shapeType: ObstacleType;

  ObstacleType = ObstacleType;
  formGroup: FormGroup;
  maxSpaceHeight: number;
  
  constructor(
    public obstacleFormService: ObstacleFormService
  ) {
    this.formGroup = this.obstacleFormService.getFormGroup();
    this.maxSpaceHeight = this.obstacleFormService.getMaxSpaceHeight();
  }

  // Confirm changes
  onSubmit() {
    this.obstacleFormService.submitForm();
  }

  // Hide and clear the form
  onClose() {
    this.obstacleFormService.closeForm();
  }

  // Restore the form
  onRestore() {
    this.obstacleFormService.restoreForm();
  }

  // Trigger validation on blur
  onBlur() {
    this.obstacleFormService.validateOnBlur();
  }

  onDragStart(event: MouseEvent) {
    const popupElement = (event.target as HTMLElement).closest('.edit-form') as HTMLElement;
    
    // Calculate the current 'top' and 'left' of the popup
    const startLeft = parseInt(window.getComputedStyle(popupElement).left, 10);
    const startTop = parseInt(window.getComputedStyle(popupElement).top, 10);
    
    // Record the current mouse position relative to the popup's top-left corner
    const offsetX = event.clientX;
    const offsetY = event.clientY;
  
    // Update the popup position as the mouse moves
    const onMouseMove = (moveEvent: MouseEvent) => {
      // Calculate the new position of the popup after the mouse moves
      const newLeft = startLeft + (moveEvent.clientX - offsetX);
      const newTop = startTop + (moveEvent.clientY - offsetY);
      
      // Update the popup position
      popupElement.style.left = `${newLeft}px`;
      popupElement.style.top = `${newTop}px`;
    };
  
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}