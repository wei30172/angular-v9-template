export type ObstacleStringValues = {
  [K in keyof Obstacle]: string;
};

export type BaseStringValues = {
  [K in keyof BaseObstacle]: string;
};

export type RectangleStringValues = {
  [K in keyof RectangleObstacle]: string;
};

export type EllipseStringValues = {
  [K in keyof EllipseObstacle]: string;
};

export type TriangleStringValues = {
  [K in keyof TriangleObstacle]: string;
};

export type TrapezoidStringValues = {
  [K in keyof TrapezoidObstacle]: string;
};

export type Obstacle = 
  RectangleObstacle | 
  EllipseObstacle | 
  TriangleObstacle | 
  TrapezoidObstacle

  
export interface BaseObstacle {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  zHeight?: number;
  startHeight?: number;
  shapeType: ObstacleType;
}

export enum ObstacleType {
  Rectangle = 'rectangle',
  Ellipse = 'ellipse',
  Triangle = 'triangle',
  Trapezoid = 'trapezoid'
}

export interface RectangleObstacle extends BaseObstacle {
  width: number;
  height: number;
}

export interface EllipseObstacle extends BaseObstacle {
  radiusX: number;
  radiusY: number;
}

export interface TriangleObstacle extends BaseObstacle {
  base: number;
  height: number;
}

export interface TrapezoidObstacle extends BaseObstacle {
  topWidth: number;
  bottomWidth: number;
  height: number;
}