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

export class DecorationEditor {
  private app: Application;
  private parent: Container;
  private decorations: DecorationData[] = [];
  private decorationTextures: Texture[] = [];
  private decorContainer: Container;
  private selectedType: number = 0;
  private ui: Container;
  private previewSprite: Sprite | null = null;
  
  private readonly TILE_WIDTH = 512;
  private readonly TILE_HEIGHT = 256;
  private readonly offsetX: number;
  private readonly offsetY: number;

  private readonly variants = [
    { scale: 0.6, name: 'Big Rock' },
    { scale: 0.5, name: 'Tiny Rock' },
    { scale: 0.5, name: 'Cactus 1' },
    { scale: 0.5, name: 'Cactus 2' },
    { scale: 0.5, name: 'Shrub' },
  ];

  constructor(app: Application, parent: Container) {
    this.app = app;
    this.parent = parent;
    this.offsetX = app.screen.width / 2;
    this.offsetY = app.screen.height / 2;
    this.decorContainer = new Container();
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
    this.app.stage.addChild(this.ui); // UI stays fixed on screen
    this.ui.zIndex = 100; // Ensure UI is on top

    // Render existing decorations
    this.renderDecorations();

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

  private setupUI(): void {
    const panelWidth = 200;
    const panelHeight = 250;
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

    // Type selector buttons
    this.variants.forEach((variant, index) => {
      const button = this.createButton(
        variant.name,
        startX + 10,
        startY + 40 + index * 30,
        180,
        25,
        () => this.selectType(index)
      );
      this.ui.addChild(button);
    });

    // Save button
    const saveButton = this.createButton(
      'Save to JSON',
      startX + 10,
      startY + 190,
      180,
      30,
      () => this.saveDecorations()
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
    onClick: () => void
  ): Container {
    const container = new Container();
    container.x = x;
    container.y = y;

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

  private updateSelection(): void {
    // Highlight selected button
    this.ui.children.forEach((child, index) => {
      if (index >= 2 && index < 7) { // Button indices
        const buttonIndex = index - 2;
        const bg = (child as any).bg;
        if (bg) {
          bg.clear();
          bg.rect(0, 0, 180, 25);
          bg.fill({ color: buttonIndex === this.selectedType ? 0x0066cc : 0x333333 });
        }
      }
    });
  }

  private setupClickHandler(): void {
    // Preview sprite that follows mouse
    this.parent.eventMode = 'static';
    this.parent.hitArea = this.app.screen;

    this.parent.on('pointermove', (e) => {
      const globalPos = e.global;
      const localPos = this.parent.toLocal(globalPos);
      
      // Don't show preview if hovering over UI (check global coords)
      if (globalPos.x < 220 && globalPos.y < 260) {
        if (this.previewSprite) {
          this.previewSprite.visible = false;
        }
        return;
      }

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
    });

    this.parent.on('pointerdown', (e: any) => {
      const globalPos = e.global;
      
      // Ignore right-clicks and clicks on UI
      if (e.button === 2 || (globalPos.x < 220 && globalPos.y < 260)) return;

      // Stop propagation to prevent viewport drag
      e.stopPropagation();
      
      const localPos = this.parent.toLocal(globalPos);

      const newDecoration: DecorationData = {
        type: this.selectedType,
        x: localPos.x,
        y: localPos.y,
        scale: this.variants[this.selectedType].scale,
      };

      this.decorations.push(newDecoration);
      this.renderDecorations();
    });
  }

  private removeDecoration(decor: DecorationData): void {
    const index = this.decorations.indexOf(decor);
    if (index > -1) {
      this.decorations.splice(index, 1);
      this.renderDecorations();
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

  destroy(): void {
    this.decorContainer.destroy({ children: true });
    this.ui.destroy({ children: true });
    if (this.previewSprite) {
      this.previewSprite.destroy();
    }
  }
}
