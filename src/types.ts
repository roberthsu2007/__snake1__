export interface Point {
  x: number;
  y: number;
}

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export enum GameStatus {
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAME_OVER = "GAME_OVER",
}
