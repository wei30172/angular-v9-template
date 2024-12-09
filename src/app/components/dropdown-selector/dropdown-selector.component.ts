import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface DropdownOption<T> {
  label: string; // The text displayed to the user
  value: T; // The actual value associated with the option
}

@Component({
  selector: 'app-dropdown-selector',
  templateUrl: './dropdown-selector.component.html',
  styleUrls: ['./dropdown-selector.component.scss']
})
export class DropdownSelectorComponent<T> {
  @Input() options: DropdownOption<T>[] = []; // List of available options
  @Input() selectedOption: T | null = null; // Currently selected option
  @Input() placeholder: string = 'Select an option'; // Placeholder for the dropdown
  @Output() optionChange = new EventEmitter<T>(); // Emits the selected option

  // Handles option selection and emits the selected value
  onSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    // Find the option by matching its stringified value
    const selected = this.options.find(option => this.matchValue(option.value, value))?.value;
    if (selected !== undefined) {
      this.optionChange.emit(selected);
    }
  }

  private matchValue(optionValue: T, eventValue: string): boolean {
    return String(optionValue) === eventValue;
  }
}