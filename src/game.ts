import { Application, Container, Ticker, Sprite, Assets, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { UIOverlay } from './ui';

import Player from './player';

import board_tiles from './board-tiles.json';
import questions from './questions.json';

interface Question {
  id: string;
  question: string;
  correctAnswer: boolean;
  points: number;
}

type gameState = 'PLAYER_TURN' | 'AWAITING_ANSWER' | 'ANIMATING' | 'GAME_OVER';

export class Game {
  private board = new Container();
  private ui!: UIOverlay;

  private readonly CHARACTER_ASSET_URL = '../assets/potat.png';
  private readonly TILE_WIDTH = 64;
  private readonly TILE_HEIGHT = 32;
  private readonly TILE_DEPTH = 16;

  private gameState: gameState = 'PLAYER_TURN';
  players: Player[] = [];
  currentPlayer: number = 0;
  private currentQuestion?: Question;
  private diceRoll: number = 0;

  constructor(
    private app: Application,
    private viewport: Container
  ) {
    this.viewport.addChild(this.board);
    this.board.sortableChildren = true;
  }

  private gridToIso(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * (this.TILE_WIDTH / 2),
      y: (gridX + gridY) * (this.TILE_HEIGHT / 2),
    };
  }

  async init(): Promise<void> {
    await this.loadAssets();
    this.drawBoard();

    const appElement = document.getElementById('app');
    if (!appElement) throw new Error('Missing #app element');
    this.ui = new UIOverlay(appElement);
    this.ui.setDiceRollCallback((value) => this.handleDiceRoll(value));
    this.ui.setAnswerCallback((answer) => this.handleAnswer(answer));
    this.ui.setGameStartCallback((players) => this.handleGameStart(players));

    this.app.ticker.add(this.update);
  }

  private async loadAssets(): Promise<void> {
    await Assets.load(this.CHARACTER_ASSET_URL);
  }

  private async drawBoard(): Promise<void> {
    const offsetX = this.app.screen.width / 2;
    const offsetY = 100;

    for (let i = 0; i < board_tiles.length; i++) {
      const tileData = board_tiles[i];
      const isoPos = this.gridToIso(tileData.x, tileData.y);

      const tile = new Graphics();

      const platformTexture = await Assets.load('../assets/platform.png');
      const tex = platformTexture as any;
      if (tex?.source) {
        tex.source.scaleMode = 'linear';
        tex.style && (tex.style.mipmap = 'on');
      }
      const platformSprite = Sprite.from(platformTexture);
      platformSprite.anchor.set(0.5, 0.5);
      platformSprite.scale.set(0.3);
      tile.addChild(platformSprite);

      tile.x = isoPos.x + offsetX;
      tile.y = isoPos.y + offsetY;

      tile.zIndex = tileData.x + tileData.y;

      (tile as any).tileId = tileData.id;
      (tile as any).gridX = tileData.x;
      (tile as any).gridY = tileData.y;

      this.board.addChild(tile);
    }
  }

  private placePlayer(player: Player): void {
    const currentTile = board_tiles.find((tile) => tile.id === player.tile);

    if (!currentTile) {
      throw new Error(`Invalid tile ${player.tile} assignment for player ${player.name}`);
    }

    const isoPos = this.gridToIso(currentTile.x, currentTile.y);
    const offsetX = this.app.screen.width / 2;
    const offsetY = 100;

    player.sprite!.x = isoPos.x + offsetX;
    player.sprite!.y = isoPos.y + offsetY - 20; // Offset upward to sit on top of tile
    player.sprite!.zIndex = currentTile.x + currentTile.y + 1000; // ensure player draws above terrain
    this.board.addChild(player.sprite!);
  }

  public async movePlayerToTile(player: Player, tileId: string): Promise<void> {
    const currentTile = board_tiles.find((tile) => tile.id === player.tile);
    const targetTile = board_tiles.find((tile) => tile.id === tileId);

    if (!targetTile) {
      throw new Error(`Tile with id ${tileId} not found`);
    }

    const targetTileIndex: number = parseInt(targetTile?.id.match(/\d+/)?.[0] || '0');
    const currentTileIndex: number = parseInt(currentTile?.id.match(/\d+/)?.[0] || '0');

    player.moveTo(tileId);

    const offsetX = this.app.screen.width / 2;
    const offsetY = 100;

    for (let i = currentTileIndex; i < targetTileIndex + 1; i++) {
      const nextTile = board_tiles.find((tile) => tile.id === `main_${i + 1}`);
      if (nextTile) {
        const isoPos = this.gridToIso(nextTile.x, nextTile.y);
        await gsap.to(player.sprite!, {
          x: isoPos.x + offsetX,
          y: isoPos.y + offsetY - 20,
          duration: 0.5,
          ease: 'power1.inOut',
        });
      }
    }
  }

  private nextTurn(): void {
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    this.ui.setActivePlayer(this.currentPlayer);
  }

  private handleGameStart(players: number): void {
    for (let i = 0; i < players; i++) {
      const player = new Player('Hero', 'main_1');
      const playerSprite = Sprite.from(this.CHARACTER_ASSET_URL);
      player.setSprite(playerSprite);
      playerSprite.scale.set(0.3);

      this.players.push(player);
      this.placePlayer(player);
    }
  }

  async handleDiceRoll(value: number): Promise<void> {
    this.diceRoll = value;
    this.gameState = 'ANIMATING';
    await this.movePlayerToTile(this.players[this.currentPlayer], `main_${value}`);
    this.gameState = 'PLAYER_TURN';
    this.nextTurn();
    // this.currentQuestion = questions[0]; 
    // this.ui.showQuestion(questions[0].question);
  }

  handleAnswer(answer: boolean): void {
    if (!this.currentQuestion) return;

    if (answer === this.currentQuestion.correctAnswer) {
      this.ui.showFeedback('Correct!', 2000);
    } else {
      this.ui.showFeedback('Incorrect!', 2000);
    }
  }

  private update = (ticker: Ticker): void => {};
}
