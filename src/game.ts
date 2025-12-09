import { Application, Container, Graphics, Ticker } from 'pixi.js';
import { Input } from './input';
import { UIOverlay } from './ui';

const TILE_SIZE = 48;
const BOARD_COLS = 12;
const BOARD_ROWS = 12;

export class Game {
  private board = new Container();
  private input = new Input();
  private camera = { x: BOARD_COLS * TILE_SIZE * 0.5, y: BOARD_ROWS * TILE_SIZE * 0.5 };
  private ui: UIOverlay;

  constructor(private app: Application) {
    this.ui = new UIOverlay(document.getElementById('app') ?? document.body);
    this.app.stage.addChild(this.board);
  }

  async init(): Promise<void> {
    await this.loadAssets();
    this.drawBoard();
    this.app.ticker.add(this.update);
  }

  private async loadAssets(): Promise<void> {
    // Placeholder: add Pixi Assets loading here when you have sprites or textures.
    return Promise.resolve();
  }

  private drawBoard(): void {
    for (let y = 0; y < BOARD_ROWS; y += 1) {
      for (let x = 0; x < BOARD_COLS; x += 1) {
        const tile = new Graphics();
        const isDark = (x + y) % 2 === 0;
        const fill = isDark ? 0x1a2236 : 0x222d45;
        tile.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(fill);
        tile.stroke({ width: 1, color: 0x2f3a55, alpha: 0.8 });
        tile.position.set(x * TILE_SIZE, y * TILE_SIZE);
        this.board.addChild(tile);
      }
    }
  }

  private update = (ticker: Ticker): void => {
    const moveSpeed = 240; // pixels per second
    const deltaSeconds = ticker.deltaMS / 1000;

    if (this.input.isPressed('up')) this.camera.y -= moveSpeed * deltaSeconds;
    if (this.input.isPressed('down')) this.camera.y += moveSpeed * deltaSeconds;
    if (this.input.isPressed('left')) this.camera.x -= moveSpeed * deltaSeconds;
    if (this.input.isPressed('right')) this.camera.x += moveSpeed * deltaSeconds;

    // Clamp camera to board bounds so you cannot scroll into the void
    const maxX = BOARD_COLS * TILE_SIZE;
    const maxY = BOARD_ROWS * TILE_SIZE;
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxY, this.camera.y));

    const { width, height } = this.app.renderer;
    this.board.position.set(width / 2 - this.camera.x, height / 2 - this.camera.y);
  };
}
