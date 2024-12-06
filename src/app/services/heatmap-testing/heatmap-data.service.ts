import { Injectable } from '@angular/core';
import { HeatmapSettings } from 'src/app/config/heatmap-settings';

@Injectable({
  providedIn: 'root'
})
export class HeatmapDataService {
  pixelData: Map<number, Map<number, number>> = new Map(); // Nested Map for efficient lookup, stores intensity for each (x, y) coordinate point.
  private cache: Map<string, number> = new Map(); // Cache for already-calculated areas

  // Generate heatmap data based on canvas width and height
  generateHeatmapData(
    width: number,
    height: number,
    scale: number = HeatmapSettings.DefaultScale,
    step: number = 2,  // Step size for iterating around each heat point
  ): void {
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);

    const heatPoints = this.generateRandomHeatPoints(scaledWidth, scaledHeight, scale);
    const radius = 50 * Math.sqrt(scale); // Radius around each heat point to affect
    
    // Process each heat point and calculate its influence on surrounding pixels
    heatPoints.forEach(point => {
      for (let dx = -radius; dx <= radius; dx += step) {
        for (let dy = -radius; dy <= radius; dy += step) {
          const x = Math.round(point.x + dx);
          const y = Math.round(point.y + dy);

          if (x >= 0 && x < scaledWidth && y >= 0 && y < scaledHeight) {
            const distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (distance <= radius) {
              const influence = point.value * (1 - distance / radius); // Decrease influence by distance
              const key = `${x},${y}`;

              // Use cache to avoid recalculating the same pixel's intensity
              if (this.cache.has(key)) {
                const existingIntensity = this.cache.get(key)!;
                this.cache.set(key, Math.min(1, existingIntensity + influence));
              } else {
                this.cache.set(key, influence);
              }

              // Store in pixelData map
              this.setPixelIntensity(x, y, this.cache.get(key)!);
            }
          }
        }
      }
    });
  }
  
  // Set intensity in pixelData with nested Maps
  private setPixelIntensity(x: number, y: number, intensity: number): void {
    if (!this.pixelData.has(x)) {
      this.pixelData.set(x, new Map<number, number>());
    }
    this.pixelData.get(x)!.set(y, intensity);
  }

  // Retrieve intensity at a specific pixel
  getPixelIntensity(x: number, y: number): number | null {
    return this.pixelData.get(x)?.get(y) || null;
  }

  // Retrieve intensity at a specific pixel, adjusting for scale
  getAverageIntensityInRadius(
    x: number,
    y: number,
    radius: number = 1, // Radius around (x, y) to calculate the average intensity
    scale: number = HeatmapSettings.DefaultScale
  ): number | null {
    const adjustedX = Math.round(x * scale);
    const adjustedY = Math.round(y * scale);
    const adjustedRadius = Math.round(radius * scale);
  
    let sumIntensity = 0;
    let count = 0;

    for (let dx = -adjustedRadius; dx <= adjustedRadius; dx++) {
      for (let dy = -adjustedRadius; dy <= adjustedRadius; dy++) {
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        if (distance <= adjustedRadius) {

          const intensity = this.getPixelIntensity(adjustedX + dx, adjustedY + dy);
          if (intensity !== null) {
            sumIntensity += intensity;
            count++;
          }
        }
      }
    }

    return count > 0 ? sumIntensity / count : null;
  }
  
  // Generate random heat points within canvas dimensions
  private generateRandomHeatPoints(
    width: number,
    height: number,
    scale: number
  ): { x: number; y: number; value: number }[] {
    const totalPixels = width * height;
    const heatPointCount = Math.floor(totalPixels * 0.001 / scale); // 0.1% of the total canvas pixels as heat points
    const heatPoints = [];
  
    for (let i = 0; i < heatPointCount; i++) {
      heatPoints.push({
        x: Math.random() * width, // Random x-coordinate within canvas width
        y: Math.random() * height, // Random y-coordinate within canvas height
        value: Math.random() * 0.5 + 0.5, // Random intensity between 0.5 and 1
      });
    }
  
    return heatPoints;
  }

  // Clear pixel data and cache when necessary
  clearHeatmapData() {
    this.pixelData.clear();
    this.cache.clear();
  }
}