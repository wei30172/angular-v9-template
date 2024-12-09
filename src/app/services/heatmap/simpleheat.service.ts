import { Injectable } from '@angular/core';
import * as simpleheat from 'simpleheat';
import { HeatmapDataService } from './heatmap-data.service';
import { HeatmapSettings } from 'src/app/config/heatmap-settings';

@Injectable({
  providedIn: 'root',
})
export class SimpleheatService {
  private heatmapInstance: ReturnType<typeof simpleheat> | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private originalCanvas: HTMLCanvasElement | null = null;

  constructor(private heatmapDataService: HeatmapDataService) {}

  // Initialize the heatmap instance with canvas and configuration
  initializeHeatmap(
    canvas: HTMLCanvasElement,
    scale: number = HeatmapSettings.DefaultScale,
    radius: number = HeatmapSettings.DefaultRadius,
    max: number = HeatmapSettings.DefaultMaxValue,
    blurFactor: number = HeatmapSettings.DefaultBlurFactor,
    gradient: Record<number, string> = HeatmapSettings.DefaultGradient
  ) {
    const scaledWidth = Math.round(canvas.width * scale);
    const scaledHeight = Math.round(canvas.height * scale);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = scaledWidth;
    offscreenCanvas.height = scaledHeight;
    
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    if (!ctx) return;

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
  
  // Render the heatmap on the canvas
  // Scales down data points based on the scale factor
  renderHeatmap(
    heatmapData: Map<number, Map<number, number>>,
    scale: number = HeatmapSettings.DefaultScale,
  ) {
    const points = [];
    // Converts heatmapData to an array of points with [x, y, intensity] format
    // Map forEach: first param is value, second is key
    heatmapData.forEach((row, x) => {
      row.forEach((intensity, y) => {
        points.push([x, y, intensity / scale]);
      });
    });
    this.heatmapInstance?.data(points);
    this.heatmapInstance?.draw();

    // Draws the offscreen canvas content onto the main canvas, resizing to fit
    const ctx = this.originalCanvas.getContext('2d') as CanvasRenderingContext2D;
    if (ctx) {
      ctx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
      ctx.drawImage(
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
  }

  // Clear the heatmap data
  clearHeatmap() {
    this.heatmapDataService.clearHeatmapData();
    this.heatmapInstance?.clear();
  }
}