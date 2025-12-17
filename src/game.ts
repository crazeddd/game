import { Application, Container, Sprite, Assets, Graphics, ColorMatrixFilter, Rectangle } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { gsap } from 'gsap';
import { UIOverlay, Question, QuestionAnswer } from './ui';

import Player from './player';

import board_tiles from '../data/board-tiles.json';
import questions from '../data/questions.json';
import random_events from '../data/random-events.json';

import potatUrl from '../assets/potat.png';
import characterUrl from '../assets/character_2.png';
import platformUrl from '../assets/platform_1_2.png';

export interface RandEvent {
  type: 'LOSE_SANITY' | 'MOVE_BACKWARD' | 'LOSE_TURN';
  amount?: number;
  description: string;
}

type gameState = 'PLAYER_TURN' | 'AWAITING_ANSWER' | 'ANIMATING' | 'GAME_OVER';

export class Game {
  private board = new Container();
  private ui!: UIOverlay;

  private readonly CHARACTER_ASSET_URL = characterUrl;

  private gameState: gameState = 'PLAYER_TURN';
  players: Player[] = [];
  currentPlayer: number = 0;
  private currentQuestion?: Question;
  private diceRoll: number = 0;

  constructor(
    private app: Application,
    private viewport: Viewport
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
    this.ui.setAnswerCallback((answer, questionId) => this.handleAnswer(answer, questionId));
    this.ui.setGameStartCallback((players) => this.handleGameStart(players));
    this.ui.setRandomEventCallback((event) => this.handleRandomEvent(event));
  }

  private async loadAssets(): Promise<void> {
    await Assets.load(this.CHARACTER_ASSET_URL);
  }

  private async drawBoard(): Promise<void> {
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

      tile.x = tileData.x;
      tile.y = tileData.y;

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

    const { x: offsetX, y: offsetY } = this.getPlayerOffset(player);
    player.sprite!.x = currentTile.x + offsetX;
    player.sprite!.y = currentTile.y - 70 + offsetY; // offset upward to sit on top of tile
    player.sprite!.zIndex = currentTile.x + currentTile.y + 10000; // ensure player draws above terrain
    this.board.addChild(player.sprite!);
  }

  private getPlayerOffset(player: Player): { x: number; y: number } {
    // Find all players on the same tile
    const playersOnTile = this.players.filter((p) => p.tile === player.tile);

    // If only one player on the tile, center them
    if (playersOnTile.length === 1) {
      return { x: 0, y: 0 };
    }

    const playerIndex = playersOnTile.indexOf(player);

    // Arrange multiple players in a circle around the tile center
    const maxRadius = 80;
    const angle = (playerIndex / Math.max(1, playersOnTile.length)) * Math.PI * 2;
    const x = Math.cos(angle) * maxRadius;
    const y = Math.sin(angle) * maxRadius;

    return { x, y };
  }

  public async movePlayerToTile(player: Player, tileId: string): Promise<void> {
    const currentTile = board_tiles.find((tile) => tile.id === player.tile);
    const targetTile = board_tiles.find((tile) => tile.id === tileId);

    const targetTileIndex: number = parseInt(targetTile?.id.match(/\d+/)?.[0] || '0');
    const currentTileIndex: number = parseInt(currentTile?.id.match(/\d+/)?.[0] || '0');

    console.log(`Moving player ${player.name} from ${player.tile} to ${tileId}`);

    player.moveTo(tileId);

    // Handle both forward and backward movement
    if (targetTileIndex > currentTileIndex) {
      // Moving forward
      for (let i = currentTileIndex; i < targetTileIndex; i++) {
        const nextTile = board_tiles.find((tile) => tile.id === `main_${i + 1}`);
        if (nextTile) {
          const offset = this.getPlayerOffset(player);
          const playerTargetX = nextTile.x + offset.x;
          const playerTargetY = nextTile.y - 70 + offset.y;

          // Animate player position
          const playerAnimation = { x: player.sprite!.x, y: player.sprite!.y };
          // Animate viewport position to match
          const viewportAnimation = { x: this.viewport.center.x, y: this.viewport.center.y };

          await gsap.to([playerAnimation, viewportAnimation], {
            x: (index) => {
              if (index === 0) return playerTargetX; // player x
              return nextTile.x; // viewport center x
            },
            y: (index) => {
              if (index === 0) return playerTargetY; // player y
              return nextTile.y; // viewport center y
            },
            duration: 0.5,
            ease: 'power1.inOut',
            onUpdate: () => {
              player.sprite!.x = playerAnimation.x;
              player.sprite!.y = playerAnimation.y;
              this.viewport.moveCenter(viewportAnimation.x, viewportAnimation.y);
            },
          });
        }
      }
    } else if (targetTileIndex < currentTileIndex) {
      // Moving backward
      for (let i = currentTileIndex; i > targetTileIndex; i--) {
        const nextTile = board_tiles.find((tile) => tile.id === `main_${i - 1}`);
        if (nextTile) {
          const offset = this.getPlayerOffset(player);
          const playerTargetX = nextTile.x + offset.x;
          const playerTargetY = nextTile.y - 90 + offset.y;

          // Animate player position
          const playerAnimation = { x: player.sprite!.x, y: player.sprite!.y };
          // Animate viewport position to match
          const viewportAnimation = { x: this.viewport.center.x, y: this.viewport.center.y };

          await gsap.to([playerAnimation, viewportAnimation], {
            x: (index) => {
              if (index === 0) return playerTargetX; // player x
              return nextTile.x; // viewport center x
            },
            y: (index) => {
              if (index === 0) return playerTargetY; // player y
              return nextTile.y; // viewport center y
            },
            duration: 0.5,
            ease: 'power1.inOut',
            onUpdate: () => {
              player.sprite!.x = playerAnimation.x;
              player.sprite!.y = playerAnimation.y;
              this.viewport.moveCenter(viewportAnimation.x, viewportAnimation.y);
            },
          });
        }
      }
    }

    // Reposition all players on the final tile to handle any collisions
    const playersOnFinalTile = this.players.filter((p) => p.tile === tileId);
    for (const p of playersOnFinalTile) {
      const offset = this.getPlayerOffset(p);
      if (p !== player) {
        // Animate other players to their new positions smoothly
        gsap.to(p.sprite!, {
          x: targetTile!.x + offset.x,
          y: targetTile!.y - 90 + offset.y,
          duration: 0.3,
          ease: 'power1.inOut',
        });
      }
    }
  }

  private nextTurn(): void {
    let startIndex = this.currentPlayer;

    if (this.players[this.currentPlayer].tile === 'main_20')
      this.players[this.currentPlayer].markFinished();

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

    // Check if player should skip this turn
    if (this.players[this.currentPlayer].useSkipTurn()) {
      console.log(`${this.players[this.currentPlayer].name} is skipping their turn.`);
      this.nextTurn();
      return;
    }

    this.ui.setActivePlayer(this.currentPlayer);

    // Re-enable dice button for the new turn
    const rollDiceBtn = document.getElementById('roll-dice-button') as HTMLButtonElement;
    if (rollDiceBtn) rollDiceBtn.disabled = false;
  }

  private async handleGameStart(players: number): Promise<void> {
    const uiPlayers = this.ui.getPlayers();
    
    for (let i = 0; i < players; i++) {
      const hue = uiPlayers[i]?.hue || 0;
      const player = new Player(`Player ${i + 1}`, 'main_1', hue);
      const playerSprite = Sprite.from(this.CHARACTER_ASSET_URL);
      player.setSprite(playerSprite);
      playerSprite.scale.set(0.15);

      // Apply hue rotation filter
      const hueFilter = new ColorMatrixFilter();
      hueFilter.hue(hue);
      playerSprite.filters = [hueFilter];
      
      this.players.push(player);
      this.placePlayer(player);
    }

    // Smooth camera pan to first player
    const firstTile = board_tiles.find((tile) => tile.id === 'main_1');
    if (firstTile) {
      // Set initial viewport position immediately
      this.viewport.moveCenter(firstTile.x, firstTile.y);
    }
  }

  async handleDiceRoll(value: number): Promise<void> {
    this.diceRoll = value;
    this.gameState = 'ANIMATING';

    const currentPlayer = this.players[this.currentPlayer];
    const currentTile = board_tiles.find((tile) => tile.id === currentPlayer.tile);
    
    // Smooth camera pan to current player before they move
    if (currentTile) {
      const startPos = { x: this.viewport.center.x, y: this.viewport.center.y };
      await gsap.to(startPos, {
        x: currentTile.x,
        y: currentTile.y,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.viewport.moveCenter(startPos.x, startPos.y);
        },
      });
    }

    let newTileIndex =
      parseInt(this.players[this.currentPlayer].tile.match(/\d+/)?.[0] || '1') + value;
    if (newTileIndex > 20) {
      newTileIndex = 20;
    }

    await this.movePlayerToTile(this.players[this.currentPlayer], `main_${newTileIndex}`);

    this.gameState = 'PLAYER_TURN';

    if (Math.random() > 0.6) {
      const randEventIndex = Math.floor(Math.random() * random_events.length);
      const event = random_events[randEventIndex] as RandEvent;
      this.ui.showEvent(event);
    } else {
      const randQuestionIndex = Math.floor(Math.random() * questions.length);
      this.currentQuestion = questions[randQuestionIndex] as Question;
      this.ui.showQuestion(
        this.currentQuestion,
        this.players[this.currentPlayer].sanity
      );
    }
  }

  async handleAnswer(answer: QuestionAnswer, questionId: string): Promise<void> {
    console.log(`Player answered with consequence: ${answer.consequence}`);
    if (!this.currentQuestion) return;
    this.ui.hideQuestion();

    this.gameState = 'ANIMATING';
    let sanityLoss = 0;
    let moveBackAmount = 0;
    let loseTurn = false;

    // Apply consequences based on the answer
    switch (answer.consequence) {
      case 'LOSE_SANITY':
        sanityLoss = answer.amount || 10;
        this.ui.loseSanity(this.currentPlayer, sanityLoss);
        this.players[this.currentPlayer].sanity = Math.max(
          0,
          this.players[this.currentPlayer].sanity - sanityLoss
        );
        this.ui.showFeedback(`Lost ${sanityLoss} sanity!`);
        break;

      case 'MOVE_BACKWARD':
        moveBackAmount = answer.amount || 1;
        this.ui.showFeedback(`Moved back ${moveBackAmount} spaces!`);
        const currentTileIndex = parseInt(this.players[this.currentPlayer].tile.match(/\d+/)?.[0] || '1');
        const newTileIndex = Math.max(1, currentTileIndex - moveBackAmount);
        await this.movePlayerToTile(this.players[this.currentPlayer], `main_${newTileIndex}`);
        break;

      case 'LOSE_TURN':
        loseTurn = true;
        this.ui.showFeedback('Lost your next turn!');
        this.players[this.currentPlayer].setSkipNextTurn();
        break;
      case 'NOTHING':
        this.ui.showFeedback('Good choice.');
        break;
    }

    // Check if player is dead
    if (this.players[this.currentPlayer].sanity <= 0) {
      console.log(`Player ${this.currentPlayer} is dead with ${this.players[this.currentPlayer].sanity} sanity`);
      this.ui.handlePlayerDead(this.currentPlayer);
      this.players[this.currentPlayer].markFinished();
    }

    setTimeout(() => {
      this.nextTurn();
    }, 2000);
  }

  handlePlayerDeath(playerIndex: number): void {
    this.ui.handlePlayerDead(playerIndex);
  }

  async handleRandomEvent(event: RandEvent): Promise<void> {
    const player = this.players[this.currentPlayer];
    switch (event.type) {
      case 'LOSE_SANITY':
        const sanityLoss = event.amount || 10;
        player.decreaseSanity(sanityLoss);
        this.ui.loseSanity(this.currentPlayer, sanityLoss);
        break;
      case 'MOVE_BACKWARD':
        let currentTileIndex = parseInt(player.tile.match(/\d+/)?.[0] || '1');
        let newTileIndex = Math.max(1, currentTileIndex - (event.amount || 1));
        await this.movePlayerToTile(player, `main_${newTileIndex}`);
        break;
      case 'LOSE_TURN':
        player.setSkipNextTurn();
        break;
    }

    // Check if player is dead after any consequence
    if (player.sanity <= 0) {~
      console.log(`Player ${this.currentPlayer} is dead with ${player.sanity} sanity`);
      this.ui.handlePlayerDead(this.currentPlayer);
      player.markFinished();
      console.log(`Player marked as finished: ${player.isFinished}`);
    }

    // Re-enable dice button after event is processed
    const rollDiceBtn = document.getElementById('roll-dice-button') as HTMLButtonElement;
    if (rollDiceBtn) rollDiceBtn.disabled = false;

    this.nextTurn();
  }

  private handleGameOver(): void {
    this.gameState = 'GAME_OVER';
    this.ui.hideDiceInput();
    this.ui.hidePlayerInfo();
    this.ui.showGameOver(this.players);
  }
}
