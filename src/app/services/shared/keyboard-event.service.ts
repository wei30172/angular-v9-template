import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class KeyboardEventService {
  private keyActionMap: Map<string, () => void> = new Map();

  constructor() {}

  // Register keyboard shortcuts with actions
  registerShortcuts(shortcuts: { keyCombo: string, action: () => void }[]) {
    shortcuts.forEach(({ keyCombo, action }) => {
      this.keyActionMap.set(keyCombo.toLowerCase(), action);
    });
  }

  // Remove multiple keyboard shortcuts
  removeShortcuts(keyCombos: string[]) {
    keyCombos.forEach(keyCombo => {
      this.keyActionMap.delete(keyCombo.toLowerCase());
    });
  }

  // Clear all keyboard shortcuts
  clearAllShortcuts() {
    this.keyActionMap.clear();
  }

  // Handles keydown events
  handleKeyDown(event: KeyboardEvent) {
    // Convert the key to lowercase
    const key = event.key.toLowerCase();

    // Build the key combo based on key and modifier keys
    const keyCombo = `${event.ctrlKey ? 'ctrl+' : ''}${key}`;
    // console.log(keyCombo);

    // Look for an action in the actionMap and execute if found
    const action = this.keyActionMap.get(keyCombo);
    if (action) {
      event.preventDefault();
      action();
    }
  }
}