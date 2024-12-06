import { Component, OnInit } from '@angular/core';
import { HeatmapSettings } from 'src/app/config/heatmap-settings';

@Component({
  selector: 'app-heatmap-indicator',
  templateUrl: './heatmap-indicator.component.html',
  styleUrls: ['./heatmap-indicator.component.scss'],
})
export class HeatmapGradientComponent implements OnInit {
  gradientStyle: string = '';

  ngOnInit() {
    this.generateGradientStyle();
  }

  // Generate gradient style based on default gradient
  private generateGradientStyle() {
    const gradientEntries = Object.entries(HeatmapSettings.DefaultGradient);
    const gradientStops = gradientEntries.map(([key, color]) => {
      const rgbaColor = this.hexToRgba(color);
      return `${rgbaColor} ${(parseFloat(key) * 100).toFixed(2)}%`;
    });
  
    // Combine gradient stops into a linear-gradient CSS string
    this.gradientStyle = `linear-gradient(to top, ${gradientStops.join(', ')})`;
  }
  
  // Convert HEX color code to RGBA format with the specified opacity
  private hexToRgba(hex: string): string {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${HeatmapSettings.IndicatorOpacity})`;
  }
}
