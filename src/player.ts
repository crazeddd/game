import * as PIXI from 'pixi.js';

class Player {
  public name: string;
  public sanity: number;
  public tile: string;
  public sprite?: PIXI.Sprite;
  public isFinished: boolean;
  public skipNextTurn: boolean;
  public hue: number;
  private tileIndex: number;

  constructor(name: string, tile: string, hue: number = 0) {
    this.name = name;
    this.sanity = 100;
    this.tile = tile;
    this.isFinished = false;
    this.skipNextTurn = false;
    this.hue = hue;
    this.tileIndex = parseInt(tile);
  }

  public decreaseSanity(amount: number): void {
    this.sanity = Math.max(0, this.sanity - amount);
  }

  public moveTo(tile: string): void {
    this.tile = tile;
    this.tileIndex = parseInt(tile);
  }

  public moveBackward(spaces: number): void {
    this.tileIndex = Math.max(0, this.tileIndex - spaces);
    this.tile = this.tileIndex.toString();
  }

  public setSkipNextTurn(): void {
    this.skipNextTurn = true;
  }

  public useSkipTurn(): boolean {
    if (this.skipNextTurn) {
      this.skipNextTurn = false;
      return true;
    }
    return false;
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