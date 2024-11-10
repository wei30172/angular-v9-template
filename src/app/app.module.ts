import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ObstacleTestingModule } from 'src/app/features/obstacle-testing/obstacle-testing.module';
import { HeatmapTestingModule } from 'src/app/features/heatmap-testing/heatmap-testing.module';
import { PdfTestingModule } from 'src/app/features/pdf-testing/pdf-testing.module';

import { SidebarComponent } from './layout/sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent
  ],
  imports: [
    BrowserModule,
    MatSnackBarModule,
    DragDropModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ObstacleTestingModule,
    HeatmapTestingModule,
    PdfTestingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
