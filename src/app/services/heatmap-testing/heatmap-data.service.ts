import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HeatmapDataService {
  
  // Generate heatmap data based on canvas width and height
  generateHeatmapData(width: number, height: number): { x: number; y: number; value: number }[] {
    const heatmapData = new Map<string, { x: number; y: number; value: number }>();
    const heatPoints = this.generateRandomHeatPoints(width, height);
    const radius = 50; // Radius around each heat point to affect
    const step = 2; // Step size for iterating around each heat point
    let maxIntensity = 0; // Track the maximum intensity value
  
    // Process each heat point and calculate its influence on surrounding pixels
    for (const point of heatPoints) {
      for (let dx = -radius; dx <= radius; dx += step) {
        for (let dy = -radius; dy <= radius; dy += step) {
          const x = Math.round(point.x + dx);
          const y = Math.round(point.y + dy);
  
          // Check if the pixel is within the canvas boundaries
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const distance = Math.sqrt(dx ** 2 + dy ** 2);
            if (distance <= radius) {
              const influence = point.value * (1 - distance / radius); // Decrease influence by distance
              const key = `${x},${y}`;
  
              // If the pixel already exists in the map, add the influence to its value
              if (heatmapData.has(key)) {
                const existingPoint = heatmapData.get(key)!;
                existingPoint.value = Math.min(1, existingPoint.value + influence);
              } else {
                // Only pixels affected by heat points are added to heatmapData
                heatmapData.set(key, { x, y, value: influence });
              }
  
              // Update the maximum intensity if the current point's value is higher
              maxIntensity = Math.max(maxIntensity, heatmapData.get(key)!.value);
            }
          }
        }
      }
    }
  
    // console.log(maxIntensity, heatmapData.size);
    // Convert the map to an array for the output
    return Array.from(heatmapData.values());
  }
  
  // Generate random heat points with positions and intensity values
  private generateRandomHeatPoints(width: number, height: number): { x: number; y: number; value: number }[] {
    const totalPixels = width * height;
    const heatPointCount = Math.floor(totalPixels * 0.001); // 0.1% of the total canvas pixels as heat points
    const heatPoints = [];
  
    for (let i = 0; i < heatPointCount; i++) {
      heatPoints.push({
        x: Math.random() * width, // Random x-coordinate within canvas width
        y: Math.random() * height, // Random y-coordinate within canvas height
        value: Math.random() * 0.5 + 0.5, // Intensity between 0.5 and 1
      });
    }
  
    return heatPoints;
  }
}