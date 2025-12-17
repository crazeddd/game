import { type Application, Assets, Container, TilingSprite, Texture, Sprite } from 'pixi.js';
import desertTileUrl from '../assets/desert_tile.png';
import bigRockUrl from '../assets/landscape/big_rock.png';
import tinyRockUrl from '../assets/landscape/tiny_rock.png';
import cactus1Url from '../assets/landscape/cactus_1.png';
import cactus2Url from '../assets/landscape/cactus_2.png';
import shrubUrl from '../assets/landscape/shrub.png';
import decorationsData from '../data/decorations.json';

export async function createBackground(
  app: Application,
  parent: Container,
): Promise<void> {
  const TILE_WIDTH = 512;
  const TILE_HEIGHT = 256;
  const GRID_SIZE = 15;

  const backgroundContainer = new Container();
  parent.addChildAt(backgroundContainer, 0);

  const offsetX = app.screen.width / 2;
  const offsetY = app.screen.height / 2;
  const topTexture = (await Assets.load(desertTileUrl)) as Texture;
  if (topTexture?.source) {
    topTexture.source.scaleMode = 'linear';
    (topTexture as any).style && ((topTexture as any).style.mipmap = 'on');
  }
  const worldWidth = GRID_SIZE * TILE_WIDTH * 2;
  const worldHeight = GRID_SIZE * TILE_HEIGHT * 2;

  const tiling = TilingSprite.from(topTexture);
  tiling.width = worldWidth;
  tiling.height = worldHeight;
  tiling.x = offsetX - worldWidth / 2;
  tiling.y = offsetY - worldHeight / 2;

  backgroundContainer.addChild(tiling);

  const decorationTextures = await Promise.all([
    Assets.load(bigRockUrl),
    Assets.load(tinyRockUrl),
    Assets.load(cactus1Url),
    Assets.load(cactus2Url),
    Assets.load(shrubUrl),
  ]) as Texture[];

  // Normalize decoration textures for better zoom quality
  for (const t of decorationTextures) {
    if (t?.source) {
      t.source.scaleMode = 'linear';
      (t as any).style && ((t as any).style.mipmap = 'on');
    }
  }

  const variants = [
    { texture: decorationTextures[0], scale: 0.6, spawnChance: 0.19 },
    { texture: decorationTextures[1], scale: 0.5, spawnChance: 0.18 },
    { texture: decorationTextures[2], scale: 0.5, spawnChance: 0.12 },
    { texture: decorationTextures[3], scale: 0.5, spawnChance: 0.12 },
    { texture: decorationTextures[4], scale: 0.5, spawnChance: 0.15 },
  ];

  const decorContainer = new Container();
  backgroundContainer.addChild(decorContainer);

  // Load decorations from JSON file
  try {
    for (const decor of decorationsData) {
      const sprite = new Sprite(decorationTextures[decor.type]);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(decor.scale);
      sprite.x = decor.x;
      sprite.y = decor.y;
      decorContainer.addChild(sprite);
    }
  } catch (e) {
    console.log('No decorations.json found or error loading decorations:', e);
  }
}
