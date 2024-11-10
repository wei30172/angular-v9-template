import { Injectable } from '@angular/core';
import simpleheat from 'simpleheat';

@Injectable({
  providedIn: 'root',
})
export class SimpleheatService {
  private heatmapInstance: simpleheat | null = null;
  private pixelData: Map<string, number> = new Map(); // Store pixel data

  // Default configuration values for 1px resolution heatmap
  private readonly DEFAULT_RADIUS = 0.5; // Small radius for single pixel influence
  private readonly DEFAULT_BLUR_FACTOR = 0; // No blur for 1px resolution clarity
  private readonly DEFAULT_MAX_VALUE = 1; // Max value for heat intensity scaling

  // Initialize the heatmap instance
  initializeHeatmap(canvas: HTMLCanvasElement, radius: number = this.DEFAULT_RADIUS, max: number = this.DEFAULT_MAX_VALUE) {
    this.heatmapInstance = simpleheat(canvas);
    this.heatmapInstance.radius(radius, radius * this.DEFAULT_BLUR_FACTOR);
    this.heatmapInstance.max(max);

    // Set gradient colors for heatmap based on intensity values
    this.heatmapInstance.gradient({
      0.0: 'navy',
      0.1: 'blue',
      0.2: 'cyan',
      0.3: 'lime',
      0.4: 'yellow',
      0.5: 'red',
    });
  }

  // Set the data points([x, y, intensity]) for the heatmap
  setHeatmapData(points: [number, number, number][]) {
    this.heatmapInstance?.data(points);

    // Save each point's intensity to pixelData map
    this.pixelData.clear();
    points.forEach(([x, y, intensity]) => {
      const key = `${x},${y}`;
      this.pixelData.set(key, intensity);
    });
  }

  // Get the intensity value at a specific pixel position
  getPixelIntensity(x: number, y: number): number | null {
    return this.pixelData.get(`${x},${y}`) || null;
  }

  // Render the heatmap on the canvas
  render() {
    this.heatmapInstance?.draw();
  }
  
  // Clear the heatmap and redraw
  clearHeatmap() {
    if (this.heatmapInstance) {
      this.heatmapInstance.clear();
      this.heatmapInstance.draw();
    }
  }
}
