export const HeatmapSettings = {
  DefaultScale: 1, // Factor to increase data resolution for more detailed rendering
  DefaultRadius: 0.5, // Radius for single pixel influence
  DefaultMaxValue: 1, // Maximum value for heat intensity scaling
  DefaultBlurFactor: 0.01, // Small blur applied to smooth the rendering
  DefaultGradient: {
    0.1: '#0000FF',  // Blue
    0.3: '#00FFFF',  // Cyan
    0.5: '#FFFF00',  // Yellow
    0.7: '#FFA500',  // Orange
    0.9: '#FF0000',  // Red
  }, // Default color gradient for heatmap visualization
  IndicatorOpacity: 0.5, // Transparency level for gradient indicators
};