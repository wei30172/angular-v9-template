import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-obstacle-editor',
  templateUrl: './obstacle-editor.component.html',
  styleUrls: ['./obstacle-editor.component.scss']
})
export class ObstacleEditorComponent implements OnInit {
  isBabylonSectionExpanded = true;

  ngOnInit(): void {}

  zoomBabylonSection(): void {
    this.isBabylonSectionExpanded = !this.isBabylonSectionExpanded;
  }
}