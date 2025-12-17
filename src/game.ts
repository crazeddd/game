import { Application, Container, Ticker, Sprite, Assets, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { UIOverlay } from './ui';

import Player from './player';

import board_tiles from '../data/board-tiles.json';
import questions from '../data/questions.json';
import potatUrl from '../assets/potat.png';
import platformUrl from '../assets/platform_1_2.png';

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

  private readonly CHARACTER_ASSET_URL = potatUrl;

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

      const tile = new Graphics();

      const platformTexture = await Assets.load(platformUrl);
      const tex = platformTexture as any;
      if (tex?.source) {
        tex.source.scaleMode = 'linear';
        tex.style && (tex.style.mipmap = 'on');
      }
      const platformSprite = Sprite.from(platformTexture);
      platformSprite.anchor.set(0.5, 0.5);
      platformSprite.scale.set(0.3);
      tile.addChild(platformSprite);

      tile.x = tileData.x * 50 + offsetX;
      tile.y = tileData.y * 50 + offsetY;

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
    const offsetX = this.app.screen.width / 2;
    const offsetY = 100;

    player.sprite!.x = currentTile.x * 50 + offsetX;
    player.sprite!.y = currentTile.y * 50 + offsetY - 90; // offset upward to sit on top of tile
    player.sprite!.zIndex = currentTile.x + currentTile.y + 1000; // ensure player draws above terrain
    this.board.addChild(player.sprite!);
  }

  private getPlayerOffsetOnTile(tileId: string, playerIndex: number): { x: number; y: number } {
    const radius = 15;
    const angle = (playerIndex * Math.PI * 2) / 5;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }

  public async movePlayerToTile(player: Player, tileId: string): Promise<void> {
    const currentTile = board_tiles.find((tile) => tile.id === player.tile);
    const targetTile = board_tiles.find((tile) => tile.id === tileId);

    const targetTileIndex: number = parseInt(targetTile?.id.match(/\d+/)?.[0] || '0');
    const currentTileIndex: number = parseInt(currentTile?.id.match(/\d+/)?.[0] || '0');

    console.log(`Moving player ${player.name} from ${player.tile} to ${tileId}`);

    player.moveTo(tileId);

    const offsetX = this.app.screen.width / 2;
    const offsetY = 100;

    for (let i = currentTileIndex; i < targetTileIndex; i++) {
      const nextTile = board_tiles.find((tile) => tile.id === `main_${i + 1}`);
      if (nextTile) {
        await gsap.to(player.sprite!, {
          x: nextTile.x * 50 + offsetX,
          y: nextTile.y * 50 + offsetY - 90,
          duration: 0.5,
          ease: 'power1.inOut',
        });
      }
    }

    // const playersOnTile = this.players.filter((p) => p.tile === tileId);
    // const playerIndexOnTile = playersOnTile.indexOf(player);
    // const offset = this.getPlayerOffsetOnTile(tileId, playerIndexOnTile);

    // await gsap.to(player.sprite!, {
    //   x: targetTile.x * 100 + offsetX + offset.x,
    //   y: targetTile.y * 100 + offsetY - 20 + offset.y,
    //   duration: 0.3,
    //   ease: 'power1.inOut',
    // });
  }

  private nextTurn(): void {
    let startIndex = this.currentPlayer;

    if (this.players[this.currentPlayer].tile === "main_20") this.players[this.currentPlayer].markFinished();

    do {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

      if (this.currentPlayer === startIndex) {
        if (this.players[this.currentPlayer].isFinished) {
          console.log('Game Over: All players are finished.');
          this.handleGameOver();
          return;
        }
      }
    } while (this.players[this.currentPlayer].isFinished === true);

    this.ui.setActivePlayer(this.currentPlayer);
  }

  private handleGameStart(players: number): void {
    for (let i = 0; i < players; i++) {
      const player = new Player(`Player ${i + 1}`, 'main_1');
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

    let newTileIndex =
      parseInt(this.players[this.currentPlayer].tile.match(/\d+/)?.[0] || '1') + value;
    if (newTileIndex > 20) {
      newTileIndex = 20;
    }

    await this.movePlayerToTile(this.players[this.currentPlayer], `main_${newTileIndex}`);

    this.gameState = 'PLAYER_TURN';

    const randQuestionIndex = Math.floor(Math.random() * questions.length);
    this.currentQuestion = questions[randQuestionIndex];
    this.ui.showQuestion(
      questions[randQuestionIndex].question,
      this.players[this.currentPlayer].sanity
    );
  }

  handleAnswer(answer: boolean): void {
    console.log(`Player answered: ${answer}`);
    if (!this.currentQuestion) return;
    this.ui.hideQuestion();

    if (answer === this.currentQuestion.correctAnswer) {
      this.ui.showFeedback('Correct!');
    } else {
      this.ui.showFeedback('Incorrect!');
      this.ui.loseSanity(this.currentPlayer);
      this.players[this.currentPlayer].sanity = Math.max(
        0,
        this.players[this.currentPlayer].sanity - 25
      );
      if (this.players[this.currentPlayer].sanity <= 0) {
        this.ui.handlePlayerDead(this.currentPlayer);
        this.players[this.currentPlayer].markFinished();
      }
    }

    setTimeout(() => {
      this.nextTurn();
    }, 2000);
  }

  handlePlayerDeath(playerIndex: number): void {
    this.ui.handlePlayerDead(playerIndex);
  }

  private handleGameOver(): void {
    this.gameState = 'GAME_OVER';
    this.ui.hideDiceInput();
    this.ui.hidePlayerInfo();
    this.ui.showGameOver(this.players);
  }

  private update = (ticker: Ticker): void => {};
}