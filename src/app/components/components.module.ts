import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { PopupOverlayComponent } from 'src/app/components/popup-overlay/popup-overlay.component';
import { EditFormComponent } from 'src/app/components/edit-form/edit-form.component';
import { ZoomControlsComponent } from 'src/app/components/zoom-controls/zoom-controls.component';
import { ShapeControlsComponent } from 'src/app/components/shape-controls/shape-controls.component';
import { ObstacleListComponent } from 'src/app/components/obstacle-list/obstacle-list.component';
import { DeleteIconComponent } from 'src/app/components/delete-icon/delete-icon.component';
import { TooltipComponent } from 'src/app/components/tooltip/tooltip.component';
import { LayerListComponent } from 'src/app/components/layer-list/layer-list.component';
import { ToggleLayerComponent } from 'src/app/components/toggle-layer/toggle-layer.component';
import { HeatmapIndicatorComponent } from 'src/app/components/heatmap-indicator/heatmap-indicator.component';
import { DropdownSelectorComponent } from 'src/app/components/dropdown-selector/dropdown-selector.component';

@NgModule({
  declarations: [
    PopupOverlayComponent,
    EditFormComponent,
    ZoomControlsComponent,
    ShapeControlsComponent,
    ObstacleListComponent,
    DeleteIconComponent,
    TooltipComponent,
    LayerListComponent,
    ToggleLayerComponent,
    HeatmapIndicatorComponent,
    DropdownSelectorComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  exports: [
    PopupOverlayComponent,
    EditFormComponent,
    ZoomControlsComponent,
    ShapeControlsComponent,
    ObstacleListComponent,
    DeleteIconComponent,
    TooltipComponent,
    LayerListComponent,
    ToggleLayerComponent,
    HeatmapIndicatorComponent,
    DropdownSelectorComponent,
  ]
})
export class ComponentsModule { }