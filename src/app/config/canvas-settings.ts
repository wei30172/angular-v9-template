export const CanvasSettings = {
  MinZoom: 1, // Minimum zoom level allowed for the canvas
  MaxZoom: 10, // Maximum zoom level allowed for the canvas
  PanOffset: 20, // Offset for panning the canvas
  ScaleBy: 1.05, // Scaling factor for zoom in/out operations
  DefaultWidth: 640, // Default canvas width
  DefaultHeight: 640, // Default canvas height
  LayerControls: { // Control the rendering of different canvas layers
    backgroundLayer: true,
    obstacleLayer: true,
    heatmapLayer: false,
    gridLayer: true,
    hoverLayer: false,
    debugLayer: false,
  },
  DefaultGridSize: 10, // Default grid size for the canvas
  HoverTarget: {
    defaultRadius: 5, // Default radius for target
    defaultColor: 'rgba(255, 0, 0, 0.9)', // Default target color
    defaultLineWidth: 0.5, // Default line width for cross
    defaultVisibility: false, // Default visibility
  },
  BackgroundImageUrl: 'assets/images/floorplan.jpg', // Default background image for the canvas
};