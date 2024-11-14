import { Injectable } from '@angular/core';
import * as simpleheat from 'simpleheat';
import { HeatmapDataService } from './heatmap-data.service';

@Injectable({
  providedIn: 'root',
})
export class SimpleheatService {
  private heatmapInstance: ReturnType<typeof simpleheat> | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private originalCanvas: HTMLCanvasElement | null = null;

  constructor(private heatmapDataService: HeatmapDataService) {}

  // Default configuration values for heatmap
  private readonly DEFAULT_SCALE = 1;  // Factor to increase data resolution for more detailed rendering
  private readonly DEFAULT_RADIUS = 0.5; // Small radius for single pixel influence
  private readonly DEFAULT_MAX_VALUE = 1; // Max value for heat intensity scaling
  private readonly DEFAULT_BLUR_FACTOR = 0.01; // Small blur for clarity

  // Initialize the heatmap instance with canvas and configuration
  initializeHeatmap(
    canvas: HTMLCanvasElement,
    scale: number = this.DEFAULT_SCALE,
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
    const scaledWidth = Math.round(canvas.width * scale);
    const scaledHeight = Math.round(canvas.height * scale);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = scaledWidth;
    offscreenCanvas.height = scaledHeight;

    const adjustedRadius = radius * scale;
    const adjustedMax = max * scale;
    const adjustedBlurFactor = blurFactor / scale;

    this.heatmapInstance = simpleheat(offscreenCanvas);
    this.heatmapInstance.radius(adjustedRadius, adjustedRadius * adjustedBlurFactor);
    this.heatmapInstance.max(adjustedMax);
    this.heatmapInstance.gradient(gradient);

    this.offscreenCanvas = offscreenCanvas;
    this.originalCanvas = canvas;
  }

  // Render the heatmap on the canvas using data from HeatmapDataService
  // Scales down data points based on the scale factor
  renderHeatmap(scale: number = this.DEFAULT_SCALE) {
    const points = [];
    // Converts pixelData to an array of points with [x, y, intensity] format
    // Map forEach: first param is value, second is key
    this.heatmapDataService.pixelData.forEach((row, x) => {
      row.forEach((intensity, y) => {
        points.push([x, y, intensity / scale]);
      });
    });
    this.heatmapInstance?.data(points);
    this.heatmapInstance?.draw();

    // Draws the offscreen canvas content onto the main canvas, resizing to fit
    const ctx = this.originalCanvas.getContext('2d');
    ctx?.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    ctx?.drawImage(
      this.offscreenCanvas,
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
      0,
      0,
      this.originalCanvas.width,
      this.originalCanvas.height
    );
  }
  
  // Clear the heatmap data
  clearHeatmap() {
    this.heatmapDataService.clearHeatmapData();
    this.heatmapInstance?.clear();
  }
}