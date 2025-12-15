import * as PIXI from 'pixi.js';

class Player {
  public name: string;
  public sanity: number;
  public tile: string;
  public sprite?: PIXI.Sprite;
  public isFinished: boolean;

  constructor(name: string, tile: string) {
    this.name = name;
    this.sanity = 100;
    this.tile = tile;
    this.isFinished = false;
  }

  public decreaseSanity(amount: number): void {
    this.sanity = Math.max(0, this.sanity - amount);
  }

  public moveTo(tile: string): void {
    this.tile = tile;
  }

  public setSprite(sprite: PIXI.Sprite): void {
    this.sprite = sprite;
    this.sprite.anchor.set(0.5);
  }

  public markFinished(): void {
    this.isFinished = true;
  }
}

export default Player;