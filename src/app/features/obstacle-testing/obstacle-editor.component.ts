import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';

@Component({
  selector: 'app-obstacle-editor',
  templateUrl: './obstacle-editor.component.html',
  styleUrls: ['./obstacle-editor.component.scss']
})
export class ObstacleEditorComponent implements OnInit {
  isBabylonSectionExpanded = true;
  isLoading$: Observable<boolean>;

  constructor(private obstacleGenerationService: ObstacleGenerationService) {}

  ngOnInit() {
    // Ensure loading state is set after change detection
    setTimeout(() => {
      this.isLoading$ = this.obstacleGenerationService.isLoading$;
    });
  }

  zoomBabylonSection() {
    this.isBabylonSectionExpanded = !this.isBabylonSectionExpanded;
  }
}