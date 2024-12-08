import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ObstacleGenerationService } from 'src/app/services/obstacle/obstacle-generation.service';

@Component({
  selector: 'app-obstacle-preview',
  templateUrl: './obstacle-preview.component.html',
  styleUrls: ['./obstacle-preview.component.scss']
})
export class ObstaclePreviewComponent implements OnInit {
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