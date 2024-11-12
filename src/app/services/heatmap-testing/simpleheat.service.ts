import { Injectable } from '@angular/core';
import simpleheat from 'simpleheat';
import { HeatmapDataService } from './heatmap-data.service';

@Injectable({
  providedIn: 'root',
})
export class SimpleheatService {
  private heatmapInstance: simpleheat | null = null;

  constructor(private heatmapDataService: HeatmapDataService) {}

  // Default configuration values for 1px resolution heatmap
  private readonly DEFAULT_RADIUS = 0.5; // Small radius for single pixel influence
  private readonly DEFAULT_MAX_VALUE = 1; // Max value for heat intensity scaling
  private readonly DEFAULT_BLUR_FACTOR = 0; // No blur for 1px resolution clarity

  // Initialize the heatmap instance with canvas and configuration
  initializeHeatmap(
    canvas: HTMLCanvasElement,
    radius: number = this.DEFAULT_RADIUS,
    max: number = this.DEFAULT_MAX_VALUE,
    blurFactor: number = this.DEFAULT_BLUR_FACTOR,
    gradient: Record<number, string> = {
      0.0: 'navy',
      0.1: 'blue',
      0.2: 'cyan',
      0.3: 'lime',
      0.4: 'yellow',
      0.5: 'red',
    }
  ) {
    this.heatmapInstance = simpleheat(canvas);
    this.heatmapInstance.radius(radius, radius * blurFactor);
    this.heatmapInstance.max(max);
    this.heatmapInstance.gradient(gradient);
  }

  // Render the heatmap on the canvas using data from HeatmapDataService
  render() {
    const points = [];
    // Converts pixelData to an array of points with [x, y, intensity] format
    // Map forEach: first param is value, second is key
    this.heatmapDataService.pixelData.forEach((row, x) => {
      row.forEach((intensity, y) => {
        points.push([x, y, intensity]);
      });
    });
    this.heatmapInstance?.data(points);
    this.heatmapInstance?.draw();
  }
  
  // Clear the heatmap data
  clearHeatmap() {
    this.heatmapDataService.clearHeatmapData();
    this.heatmapInstance?.clear();
  }
}