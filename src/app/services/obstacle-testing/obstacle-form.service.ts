import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Subject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ObstacleSettings } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import {
  Obstacle,
  BaseObstacle,
  ObstacleType,
  RectangleObstacle,
  EllipseObstacle,
  TriangleObstacle,
  TrapezoidObstacle,
  ObstacleStringValues,
  RectangleStringValues,
  EllipseStringValues,
  TriangleStringValues,
  TrapezoidStringValues
} from 'src/app/models/obstacle.model';

type FormControlConfig = Record<string, [unknown, Validators[]]>;

@Injectable({
  providedIn: 'root'
})
export class ObstacleFormService {
  private formGroup: FormGroup;
  private formSubscription: Subscription | null = null;
  private formChanges$ = new Subject<ObstacleStringValues>();
  private isFormVisible$ = new Subject<boolean>();

  // Store obstacle data before editing
  private editingObstacle: Obstacle | null = null;
  // Store pending changes temporarily
  private pendingChanges: ObstacleStringValues | null = null;
  // Dynamic space height
  maxSpaceHeight: number;

  constructor(private formBuilder: FormBuilder) {
    this.formGroup = this.formBuilder.group({});
    this.maxSpaceHeight = ObstacleSettings.DefaultSpaceHeight;
  }

  // Getter for maxSpaceHeight
  getMaxSpaceHeight(): number {
    return this.maxSpaceHeight;
  }

  // Dynamically set space height
  setMaxSpaceHeight(height: number): void {
    this.maxSpaceHeight = height;
  }

  // Get the form group
  getFormGroup(): FormGroup {
    return this.formGroup;
  }
  
  // Observable for form visibility status
  getFormVisibility(): Observable<boolean> {
    return this.isFormVisible$.asObservable();
  }

  // Get form changes dynamically based on the shape type
  getFormChanges(): Observable<Obstacle> {
    return this.formChanges$.asObservable().pipe(
      map(value => this.processFormValues(value))
    );
  }
  
  // Define form control configuration by shape type
  private formControlConfig: { [key in ObstacleType]: () => FormControlConfig } = {
    [ObstacleType.Rectangle]: () => ({
      width: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
      height: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
    }),
    [ObstacleType.Ellipse]: () => ({
      radiusX: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
      radiusY: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
    }),
    [ObstacleType.Triangle]: () => ({
      base: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
      height: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
    }),
    [ObstacleType.Trapezoid]: () => ({
      topWidth: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
      bottomWidth: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
      height: ['', [Validators.required, this.numberRangeValidator(1, Infinity)]],
    }),
  };

  // Create a form group dynamically based on the shape type
  createFormGroup(shapeType: ObstacleType): FormGroup {
    // Base controls
    const baseControls = {
      id: ['', [Validators.required]],
      x: ['', [Validators.required, this.numberRangeValidator(0, Infinity)]], // x must be >= 0
      y: ['', [Validators.required, this.numberRangeValidator(0, Infinity)]], // y must be >= 0
      rotation: ['', [Validators.required, this.numberRangeValidator(-360, 360)]], // rotation must be between -360 and 360
      color: ['#000000', [Validators.required, Validators.pattern('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')]], // color must be hex code (e.g., #RRGGBB)
      zHeight: ['', [Validators.required, this.numberRangeValidator(1, this.maxSpaceHeight)]], // zHeight must be between 1 and maxSpaceHeight
      startHeight: ['', [Validators.required, this.numberRangeValidator(0, this.maxSpaceHeight)]], // startHeight must be between 0 and maxSpaceHeight
      shapeType: [shapeType, [Validators.required]],
    };

    // Combine base controls with shape-specific controls
    const shapeControls = this.formControlConfig[shapeType]?.() || {};
    const group = this.formBuilder.group(
      {
        ...baseControls,
        ...shapeControls,
      }
    );

    return group;
  }

  // Number range validator
  numberRangeValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = parseFloat(control.value);
      if (isNaN(value) || value < min || value > max) {
        return { pattern: { min, max } };
      }
      return null;
    };
  }

  // Trigger validation on blur
  validateOnBlur(): void {
    const errors = this.combinedHeightValidator()(this.formGroup);
    this.formGroup.setErrors(errors);
  }

  // Ensures zHeight + startHeight ≤ maxSpaceHeight
  private combinedHeightValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const zHeightControl = group.get('zHeight');
      const startHeightControl = group.get('startHeight');
  
      if (!zHeightControl || !startHeightControl) return null;
  
      const zHeight = parseFloat(zHeightControl.value);
      const startHeight = parseFloat(startHeightControl.value);
      
      if (isNaN(zHeight) || isNaN(startHeight)) return null;
      
      if (zHeight + startHeight > this.maxSpaceHeight) {
        return { exceedsMaxSpaceHeight: true };
      }
  
      return null;
    };
  }

  // Map for attributes or values based on shape type
  private shapeHandlers = new Map<
    ObstacleType,
    {
      parse: (values: Partial<ObstacleStringValues>, minValue: number) => Partial<Obstacle>;
      format: (values: Partial<Obstacle>, currentValues: any) => { [key: string]: string };
    }
  >([
    [ObstacleType.Rectangle, {
      parse: (values, minValue) => ({
        width: this.toNumber((values as Partial<RectangleStringValues>).width, minValue),
        height: this.toNumber((values as Partial<RectangleStringValues>).height, minValue),
      }),
      format: (values, currentValues) => ({
        width: this.toString((values as Partial<RectangleObstacle>).width ?? currentValues.width),
        height: this.toString((values as Partial<RectangleObstacle>).height ?? currentValues.height),
      }),
    }],
    [ObstacleType.Ellipse, {
      parse: (values, minValue) => ({
        radiusX: this.toNumber((values as Partial<EllipseStringValues>).radiusX, minValue),
        radiusY: this.toNumber((values as Partial<EllipseStringValues>).radiusY, minValue),
      }),
      format: (values, currentValues) => ({
        radiusX: this.toString((values as Partial<EllipseObstacle>).radiusX ?? currentValues.radiusX),
        radiusY: this.toString((values as Partial<EllipseObstacle>).radiusY ?? currentValues.radiusY),
      }),
    }],
    [ObstacleType.Triangle, {
      parse: (values, minValue) => ({
        base: this.toNumber((values as Partial<TriangleStringValues>).base, minValue),
        height: this.toNumber((values as Partial<TriangleStringValues>).height, minValue),
      }),
      format: (values, currentValues) => ({
        base: this.toString((values as Partial<TriangleObstacle>).base ?? currentValues.base),
        height: this.toString((values as Partial<TriangleObstacle>).height ?? currentValues.height),
      }),
    }],
    [ObstacleType.Trapezoid, {
      parse: (values, minValue) => ({
        topWidth: this.toNumber((values as Partial<TrapezoidStringValues>).topWidth, minValue),
        bottomWidth: this.toNumber((values as Partial<TrapezoidStringValues>).bottomWidth, minValue),
        height: this.toNumber((values as Partial<TrapezoidStringValues>).height, minValue),
      }),
      format: (values, currentValues) => ({
        topWidth: this.toString((values as Partial<TrapezoidObstacle>).topWidth ?? currentValues.topWidth),
        bottomWidth: this.toString((values as Partial<TrapezoidObstacle>).bottomWidth ?? currentValues.bottomWidth),
        height: this.toString((values as Partial<TrapezoidObstacle>).height ?? currentValues.height),
      }),
    }],
  ]);

  // Safe number conversion
  private toNumber(value: string | undefined, minValue: number, defaultValue: number = 0): number {
    if (value == null) return defaultValue;
    const numberValue = parseFloat(value);
    if (isNaN(numberValue)) return defaultValue;
    return minValue !== undefined ? Math.max(numberValue, minValue) : numberValue;
  }

  // Get form changes dynamically based on the shape type
  private processFormValues(values: ObstacleStringValues): Obstacle {
    // Extract base attributes common to all shapes
    const basicValue: BaseObstacle = {
      id: values.id,
      x: typeof values.x === 'number' ? values.x : this.toNumber(values.x, 0),
      y: typeof values.y === 'number' ? values.y : this.toNumber(values.y, 0),
      rotation: typeof values.rotation === 'number' ? values.rotation : this.toNumber(values.rotation, 0),
      color: values.color || '#000000',
      zHeight: typeof values.zHeight === 'number' ? values.zHeight : this.toNumber(values.zHeight, 0),
      startHeight: typeof values.startHeight === 'number' ? values.startHeight : this.toNumber(values.startHeight, 0),
      shapeType: values.shapeType as ObstacleType,
    };

    // Retrieve and apply type-specific attributes
    const handler = this.shapeHandlers.get(values.shapeType as ObstacleType);
    const shapeAttributes = handler?.parse(values, 1) || {};
    return { ...basicValue, ...shapeAttributes } as Obstacle;
  }

  // Update form values, with an option for partial or full update
  updateFormValues(values: Partial<Obstacle>, isPartial: boolean = true): void {
    const currentValues = this.formGroup.value;

    const updatedValues = {
      id: values.id ?? currentValues.id,
      x: this.toString(values.x ?? currentValues.x),
      y: this.toString(values.y ?? currentValues.y),
      rotation: this.toString(values.rotation ?? currentValues.rotation),
      color: values.color ?? currentValues.color ?? '#000000',
      zHeight: this.toString(values.zHeight ?? currentValues.zHeight),
      startHeight: this.toString(values.startHeight ?? currentValues.startHeight),
      shapeType: values.shapeType?? currentValues.shapeType,
    };

    // Merge attributes with type-specific attributes and return the result
    const handler = this.shapeHandlers.get(values.shapeType);
    const shapeAttributes = handler?.format(values, currentValues) || {};
    const finalUpdatedValues = { ...updatedValues, ...shapeAttributes };
    // Perform a partial or full update
    if (isPartial) {
      this.formGroup.patchValue(finalUpdatedValues); // Partial update
    } else {
      this.formGroup.setValue(finalUpdatedValues); // Full update
    }
  }
  
  // Convert numbers to strings
  private toString(value: number | string | undefined): string {
    if (typeof value === 'string') {
      return value || '';
    } else if (typeof value === 'number' && !isNaN(value)) {
      return value.toString();
    }
    return '';
  }

  // Updates form controls dynamically.
  private updateFormControls(newFormGroup: FormGroup): void {
    Object.keys(this.formGroup.controls).forEach(controlName => {
      this.formGroup.removeControl(controlName);
    });

    Object.keys(newFormGroup.controls).forEach(controlName => {
      const control = newFormGroup.get(controlName);
      if (control) {
        this.formGroup.addControl(controlName, control);
      }
    });
    
    this.formGroup.updateValueAndValidity();
  }

  // Show form and dynamically configure based on obstacle type
  showForm(obstacle: Obstacle): void {
    // Save editing obstacle
    this.editingObstacle = { ...obstacle };

    // Dynamically create form group based on the obstacle type
    const newFormGroup = this.createFormGroup(obstacle.shapeType as ObstacleType);
    this.updateFormControls(newFormGroup);

    // Unsubscribe from previous subscription if exists
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

    // Subscribe to form value changes and update pendingChanges if valid
    this.formSubscription = this.formGroup.valueChanges.subscribe((values) => {
      if (this.formGroup.valid) {
        this.pendingChanges = values; // Save valid changes
      }
    });

    // Populate form with obstacle data
    this.updateFormValues(obstacle, false)

    // Notify that the form is visible
    this.isFormVisible$.next(true);
  }

  // Confirm changes and emit to subscribers
  submitForm(): void {
    if (!this.pendingChanges || !this.formGroup.valid) return;

    this.formChanges$.next(this.pendingChanges);
    this.pendingChanges = null;
  }

  // Hide and clear the form
  closeForm(): void {
    // Notify that the form is hidden
    this.isFormVisible$.next(false);

    // Unsubscribe from valueChanges
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
      this.formSubscription = null;
    }

    // Clear the form to initial state
    this.clearForm();
  }

  // Restore the form to the editing state
  restoreForm(): void {
    if (this.editingObstacle) {
      // Restore the form with the original obstacle data
      this.updateFormValues(this.editingObstacle, false);
    }
    this.formChanges$.next(this.pendingChanges);
    this.pendingChanges = null;
  }

  // Clear the form to initial state
  clearForm(): void {
    this.formGroup.reset({ // Reset all controls
      id: '',
      x: 0,
      y: 0,
      rotation: 0,
      color: '#000000',
      shapeType: null,
    });
    this.pendingChanges = null; // Clear pending changes
    this.editingObstacle = null; // Clear editing obstacle reference
  }
}