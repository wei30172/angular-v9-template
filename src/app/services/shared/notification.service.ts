import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  open(message: string, action: string = 'OK', duration: number = 3000) {
    this.snackBar.open(message, action, { duration });
  }
}