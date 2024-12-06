export const ObstacleSettings = {
  MinDrag: 2, // Minimum drag distance required to create a new obstacle
  MoveOffset: 10, // Distance offset used for moving and pasting obstacles
  DefaultZHeight: 50, // Default height for 3D obstacles along the Z-axis
  DefaultSpaceHeight: 350, // Default vertical space height for obstacle generation
  DefaultObstacleCount: 100, // Default number of obstacles to generate
  MaxIterations: 10, // Maximum number of iterations for obstacle generation to avoid infinite loops
  MaxObstacleSize: 60, // Maximum allowable size for generated obstacles
  MinObstacleSize: 10, // Minimum allowable size for generated obstacles
  DefaultTopWidthRatio: 0.7, // Default ratio of top width to bottom width for trapezoid obstacles
  Transformer: {
    AnchorSize: 15, // Anchor size for the transformer
    Opacity: 0.8, // Opacity for the transformer
  },
  MaterialOpacity: 0.9, // Opacity for the 3D material
};