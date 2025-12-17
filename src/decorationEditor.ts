import { type Application, Assets, Container, Sprite, Texture, Graphics, Text } from 'pixi.js';
import board_tiles from '../data/board-tiles.json';
import decorations from '../data/decorations.json';
import bigRockUrl from '../assets/landscape/big_rock.png';
import tinyRockUrl from '../assets/landscape/tiny_rock.png';
import cactus1Url from '../assets/landscape/cactus_1.png';
import cactus2Url from '../assets/landscape/cactus_2.png';
import shrubUrl from '../assets/landscape/shrub.png';

interface DecorationData {
  type: number;
  x: number;
  y: number;
  scale: number;
}

interface BoardTileData {
  x: number;
  y: number;
  type: string;
  id: string;
}

type EditorMode = 'decoration' | 'board-tile';

export class DecorationEditor {
  private app: Application;
  private parent: Container;
  private decorations: DecorationData[] = [];
  private boardTiles: BoardTileData[] = [];
  private decorationTextures: Texture[] = [];
  private decorContainer: Container;
  private boardTileContainer: Container;
  private selectedType: number = 0;
  private selectedTileType: string = '1';
  private ui: Container;
  private previewSprite: Sprite | null = null;
  private previewTile: Graphics | null = null;
  private editorMode: EditorMode = 'decoration';
  private nextTileId: number = 1;
  
  private readonly TILE_WIDTH = 512;
  private readonly TILE_HEIGHT = 256;
  private readonly offsetX: number;
  private readonly offsetY: number;
  private readonly TILE_RADIUS = 20;

  private readonly variants = [
    { scale: 0.6, name: 'Big Rock' },
    { scale: 0.5, name: 'Tiny Rock' },
    { scale: 0.5, name: 'Cactus 1' },
    { scale: 0.5, name: 'Cactus 2' },
    { scale: 0.5, name: 'Shrub' },
  ];

  private readonly boardTileTypes = ['1', '2', '3'];

  constructor(app: Application, parent: Container) {
    this.app = app;
    this.parent = parent;
    this.offsetX = app.screen.width / 2;
    this.offsetY = app.screen.height / 2;
    this.decorContainer = new Container();
    this.boardTileContainer = new Container();
    this.ui = new Container();
  }

  async init(): Promise<void> {
    // Load existing decorations
    try {
      const response = await fetch('../data/decorations.json');
      this.decorations = await response.json();
    } catch (e) {
      console.log('No existing decorations found, starting fresh');
      this.decorations = [];
    }

    // Load existing board tiles
    try {
      const response = await fetch('../data/board-tiles.json');
      this.boardTiles = await response.json();
      // Calculate next ID
      this.nextTileId = Math.max(...this.boardTiles.map(t => {
        const match = t.id.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })) + 1;
    } catch (e) {
      console.log('No existing board tiles found, starting fresh');
      this.boardTiles = [];
      this.nextTileId = 1;
    }

    // Load textures
    this.decorationTextures = await Promise.all([
      Assets.load(bigRockUrl),
      Assets.load(tinyRockUrl),
      Assets.load(cactus1Url),
      Assets.load(cactus2Url),
      Assets.load(shrubUrl),
    ]) as Texture[];

    // Normalize textures
    for (const t of this.decorationTextures) {
      if (t?.source) {
        t.source.scaleMode = 'linear';
        (t as any).style && ((t as any).style.mipmap = 'on');
      }
    }

    this.parent.addChild(this.decorContainer);
    this.parent.addChild(this.boardTileContainer);
    this.app.stage.addChild(this.ui); // UI stays fixed on screen
    this.ui.zIndex = 100; // Ensure UI is on top

    // Render existing decorations and board tiles
    this.renderDecorations();
    this.renderBoardTiles();

    // Setup UI
    this.setupUI();

    // Setup click handler
    this.setupClickHandler();
  }

  private renderDecorations(): void {
    this.decorContainer.removeChildren();
    this.previewSprite = null; // Reset preview so it gets recreated

    for (const decor of this.decorations) {
      const sprite = new Sprite(this.decorationTextures[decor.type]);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(decor.scale);
      sprite.x = decor.x;
      sprite.y = decor.y;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';

      // Right-click to delete
      sprite.on('pointerdown', (e: any) => {
        if (e.button === 2) { // Right mouse button
          e.stopPropagation();
          this.removeDecoration(decor);
        }
      });

      this.decorContainer.addChild(sprite);
    }
  }

  private renderBoardTiles(): void {
    this.boardTileContainer.removeChildren();
    this.previewTile = null; // Reset preview

    const colors: Record<string, number> = { '1': 0x00ff00, '2': 0x0000ff, '3': 0xff00ff };

    for (const tile of this.boardTiles) {
      const circle = new Graphics();
      circle.circle(0, 0, this.TILE_RADIUS);
      circle.fill({ color: colors[tile.type] || 0xffff00 });
      circle.x = tile.x;
      circle.y = tile.y;
      circle.eventMode = 'static';
      circle.cursor = 'pointer';

      // Add label
      const label = new Text({
        text: tile.id,
        style: { fill: 0xffffff, fontSize: 10 }
      });
      label.anchor.set(0.5);
      circle.addChild(label);

      // Right-click to delete
      circle.on('pointerdown', (e: any) => {
        if (e.button === 2) {
          e.stopPropagation();
          this.removeBoardTile(tile);
        }
      });

      this.boardTileContainer.addChild(circle);
    }
  }

  private setupUI(): void {
    const panelWidth = 200;
    const panelHeight = 350;
    const startX = (this.app.screen.width - panelWidth) / 2;
    const startY = 10;

    const uiBackground = new Graphics();
    uiBackground.rect(startX, startY, panelWidth, panelHeight);
    uiBackground.fill({ color: 0x000000, alpha: 0.7 });
    this.ui.addChild(uiBackground);

    const title = new Text({
      text: 'Decoration Editor',
      style: { fill: 0xffffff, fontSize: 16, fontWeight: 'bold' }
    });
    title.x = startX + panelWidth / 2;
    title.y = startY + 10;
    title.anchor.set(0.5, 0);
    this.ui.addChild(title);

    // Mode toggle buttons
    const decorButton = this.createButton(
      'Decorations',
      startX + 10,
      startY + 40,
      85,
      25,
      () => this.setMode('decoration')
    );
    this.ui.addChild(decorButton);

    const tileButton = this.createButton(
      'Board Tiles',
      startX + 105,
      startY + 40,
      85,
      25,
      () => this.setMode('board-tile')
    );
    this.ui.addChild(tileButton);

    // Type selector buttons - Decorations
    this.variants.forEach((variant, index) => {
      const button = this.createButton(
        variant.name,
        startX + 10,
        startY + 75 + index * 30,
        180,
        25,
        () => this.selectType(index),
        `decor-btn-${index}`
      );
      this.ui.addChild(button);
    });

    // Type selector buttons - Board Tiles
    this.boardTileTypes.forEach((type, index) => {
      const button = this.createButton(
        `Type ${type}`,
        startX + 10,
        startY + 75 + index * 30,
        180,
        25,
        () => this.selectTileType(type),
        `tile-btn-${type}`
      );
      button.visible = false;
      this.ui.addChild(button);
    });

    // Save button
    const saveButton = this.createButton(
      'Save to JSON',
      startX + 10,
      startY + 310,
      180,
      30,
      () => this.saveData(),
      'save-btn'
    );
    this.ui.addChild(saveButton);

    this.updateSelection();
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void,
    id?: string
  ): Container {
    const container = new Container();
    container.x = x;
    container.y = y;
    if (id) (container as any).id = id;

    const bg = new Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: 0x333333 });
    bg.eventMode = 'static';
    bg.cursor = 'pointer';

    const label = new Text({
      text,
      style: { fill: 0xffffff, fontSize: 12 }
    });
    label.x = width / 2;
    label.y = height / 2;
    label.anchor.set(0.5);

    container.addChild(bg);
    container.addChild(label);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: 0x555555 });
    });
    bg.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: 0x333333 });
    });

    (container as any).bg = bg;
    (container as any).label = label;

    return container;
  }

  private selectType(type: number): void {
    this.selectedType = type;
    this.updateSelection();
  }

  private selectTileType(type: string): void {
    this.selectedTileType = type;
    this.updateSelection();
  }

  private setMode(mode: EditorMode): void {
    this.editorMode = mode;
    this.previewSprite = null;
    this.previewTile = null;
    
    // Toggle visibility
    this.decorContainer.visible = mode === 'decoration';
    this.boardTileContainer.visible = mode === 'board-tile';

    // Update button visibility
    this.ui.children.forEach((child) => {
      const id = (child as any).id;
      if (id?.startsWith('decor-btn-')) {
        child.visible = mode === 'decoration';
      } else if (id?.startsWith('tile-btn-')) {
        child.visible = mode === 'board-tile';
      }
    });

    this.updateSelection();
  }

  private updateSelection(): void {
    // Highlight selected button
    if (this.editorMode === 'decoration') {
      this.ui.children.forEach((child) => {
        const id = (child as any).id;
        if (id?.startsWith('decor-btn-')) {
          const buttonIndex = parseInt(id.split('-')[2]);
          const bg = (child as any).bg;
          if (bg) {
            bg.clear();
            bg.rect(0, 0, 180, 25);
            bg.fill({ color: buttonIndex === this.selectedType ? 0x0066cc : 0x333333 });
          }
        }
      });
    } else {
      this.ui.children.forEach((child) => {
        const id = (child as any).id;
        if (id?.startsWith('tile-btn-')) {
          const type = id.split('-')[2];
          const bg = (child as any).bg;
          if (bg) {
            bg.clear();
            bg.rect(0, 0, 180, 25);
            bg.fill({ color: type === this.selectedTileType ? 0x0066cc : 0x333333 });
          }
        }
      });
    }
  }

  private setupClickHandler(): void {
    const colors: Record<string, number> = { '1': 0x00ff00, '2': 0x0000ff, '3': 0xff00ff };

    this.parent.eventMode = 'static';
    this.parent.hitArea = this.app.screen;

    this.parent.on('pointermove', (e) => {
      const globalPos = e.global;
      const localPos = this.parent.toLocal(globalPos);
      
      // Don't show preview if hovering over UI
      if (globalPos.x < 220 && globalPos.y < 360) {
        if (this.previewSprite) this.previewSprite.visible = false;
        if (this.previewTile) this.previewTile.visible = false;
        return;
      }

      if (this.editorMode === 'decoration') {
        if (!this.previewSprite) {
          this.previewSprite = new Sprite(this.decorationTextures[this.selectedType]);
          this.previewSprite.anchor.set(0.5, 1);
          this.previewSprite.alpha = 0.5;
          this.decorContainer.addChild(this.previewSprite);
        }

        this.previewSprite.texture = this.decorationTextures[this.selectedType];
        this.previewSprite.scale.set(this.variants[this.selectedType].scale);
        this.previewSprite.x = localPos.x;
        this.previewSprite.y = localPos.y;
        this.previewSprite.visible = true;
      } else {
        if (!this.previewTile) {
          this.previewTile = new Graphics();
          this.previewTile.alpha = 0.5;
          this.boardTileContainer.addChild(this.previewTile);
        }

        this.previewTile.clear();
        this.previewTile.circle(0, 0, this.TILE_RADIUS);
        this.previewTile.fill({ color: colors[this.selectedTileType] });
        this.previewTile.x = localPos.x;
        this.previewTile.y = localPos.y;
        this.previewTile.visible = true;
      }
    });

    this.parent.on('pointerdown', (e: any) => {
      const globalPos = e.global;
      
      // Ignore right-clicks and clicks on UI
      if (e.button === 2 || (globalPos.x < 220 && globalPos.y < 360)) return;

      // For board tiles, require shift-click
      if (this.editorMode === 'board-tile' && !e.shiftKey) return;

      // Stop propagation to prevent viewport drag
      e.stopPropagation();
      
      const localPos = this.parent.toLocal(globalPos);

      if (this.editorMode === 'decoration') {
        const newDecoration: DecorationData = {
          type: this.selectedType,
          x: localPos.x,
          y: localPos.y,
          scale: this.variants[this.selectedType].scale,
        };

        this.decorations.push(newDecoration);
        this.renderDecorations();
      } else {
        const newTile: BoardTileData = {
          x: Math.round(localPos.x),
          y: Math.round(localPos.y),
          type: this.selectedTileType,
          id: `main_${this.nextTileId}`,
        };

        this.nextTileId++;
        this.boardTiles.push(newTile);
        this.renderBoardTiles();
      }
    });
  }

  private removeDecoration(decor: DecorationData): void {
    const index = this.decorations.indexOf(decor);
    if (index > -1) {
      this.decorations.splice(index, 1);
      this.renderDecorations();
    }
  }

  private removeBoardTile(tile: BoardTileData): void {
    const index = this.boardTiles.indexOf(tile);
    if (index > -1) {
      this.boardTiles.splice(index, 1);
      this.renderBoardTiles();
    }
  }

  private async saveData(): Promise<void> {
    if (this.editorMode === 'decoration') {
      this.saveDecorations();
    } else {
      this.saveBoardTiles();
    }
  }

  private async saveDecorations(): Promise<void> {
    const json = JSON.stringify(this.decorations, null, 2);
    
    // Create a download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decorations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Decorations saved! Place the downloaded file in data/decorations.json');
    alert('Decorations saved! Place the downloaded decorations.json file in the data/ folder.');
  }

  private async saveBoardTiles(): Promise<void> {
    const json = JSON.stringify(this.boardTiles, null, 2);
    
    // Create a download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'board-tiles.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Board tiles saved! Place the downloaded file in data/board-tiles.json');
    alert('Board tiles saved! Place the downloaded board-tiles.json file in the data/ folder.');
  }

  destroy(): void {
    this.decorContainer.destroy({ children: true });
    this.boardTileContainer.destroy({ children: true });
    this.ui.destroy({ children: true });
    if (this.previewSprite) {
      this.previewSprite.destroy();
    }
    if (this.previewTile) {
      this.previewTile.destroy();
    }
  }
}
