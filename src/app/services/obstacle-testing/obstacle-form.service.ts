import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Injectable({
  providedIn: 'root'
})
export class ObstacleFormService {
  private formGroup: FormGroup;
  private formChanges$ = new Subject<Obstacle>();
  private isFormVisible$ = new Subject<boolean>();

  // Stores the original obstacle data before editing
  private editingObstacle: Obstacle | null = null;

  constructor(private formBuilder: FormBuilder) {
    // Initialize the form group with validators
    this.formGroup = this.formBuilder.group({
      id: [''],
      x: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      y: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      width: ['', [Validators.required, Validators.min(1)]],
      height: ['', [Validators.required, Validators.min(1)]],
      color: [''],
    });

    // Emit form value changes
    this.formGroup.valueChanges.subscribe(value => {
      this.formChanges$.next(value);
    });
  }

  // Get the form group
  getForm(): FormGroup {
    return this.formGroup;
  }

  // Observable for form changes with type conversion to number
  getFormChanges(): Observable<Obstacle> {
    return this.formChanges$.asObservable().pipe(
      map(value => ({
        ...value,
        x: isNaN(Number(value.x)) ? 0 : Number(value.x),
        y: isNaN(Number(value.y)) ? 0 : Number(value.y),
        width: isNaN(Number(value.width)) ? 0 : Number(value.width),
        height: isNaN(Number(value.height)) ? 0 : Number(value.height)
      }))
    );
  }

  // Observable for form visibility status
  getFormVisibility(): Observable<boolean> {
    return this.isFormVisible$.asObservable();
  }

  // Show the form and populate it with obstacle data
  showForm(obstacle: Obstacle): void {
    this.editingObstacle = { ...obstacle };
    this.populateForm(obstacle);
    this.isFormVisible$.next(true);
  }

  // Hide the form and clear editing data
  hideForm(): void {
    this.isFormVisible$.next(false);
    this.editingObstacle = null;
    this.resetForm();
  }

  // Cancel the form edits and revert to original values
  cancelForm(): void {
    if (this.editingObstacle) {
      // Restore the form with the original obstacle data
      this.populateForm(this.editingObstacle);
    }
  }

  // Populate the form with given obstacle values
  populateForm(obstacle: Obstacle): void {
    this.formGroup.setValue({
      id: obstacle.id.toString(),
      x: obstacle.x.toString(),
      y: obstacle.y.toString(),
      width: obstacle.width.toString(),
      height: obstacle.height.toString(),
      color: obstacle.color || '',
    });
  }

  // Partially update the form with provided values
  patchFormValue(values: Partial<Obstacle>): void {
    this.formGroup.patchValue({
      x: this.convertToString(values.x),
      y: this.convertToString(values.y),
      width: this.convertToString(values.width),
      height: this.convertToString(values.height),
      color: values.color || '',
    });
  }
  
  // Convert numbers to strings
  private convertToString(value: number | undefined): string {
    return value !== undefined && !isNaN(value) ? value.toString() : '';
  }
  
  // Reset the form to initial state
  resetForm(): void {
    this.formGroup.reset();
  }
}
