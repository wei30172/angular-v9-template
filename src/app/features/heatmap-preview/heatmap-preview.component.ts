import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';

@Component({
  selector: 'app-heatmap-preview',
  templateUrl: './heatmap-preview.component.html',
  styleUrls: ['./heatmap-preview.component.scss']
})
export class HeatmapPreviewComponent implements OnInit {
  is3DSectionExpanded = true;
  isLoading$: Observable<boolean>;

  constructor(private obstacleGenerationService: ObstacleGenerationService) {}

  ngOnInit() {
    // Ensure loading state is set after change detection
    setTimeout(() => {
      this.isLoading$ = this.obstacleGenerationService.isLoading$;
    });
  }

  zoomBabylonSection() {
    this.is3DSectionExpanded = !this.is3DSectionExpanded;
  }
}