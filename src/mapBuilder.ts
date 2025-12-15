import { type Application, Assets, Container, TilingSprite, Texture, Sprite } from 'pixi.js';

export async function createIsometricBackground(
  app: Application,
  parent: Container,
): Promise<void> {
  const TILE_WIDTH = 512;
  const TILE_HEIGHT = 256;
  const GRID_SIZE = 10;

  const backgroundContainer = new Container();
  parent.addChildAt(backgroundContainer, 0);

  const offsetX = app.screen.width / 2;
  const offsetY = app.screen.height / 2;
  const topTexture = (await Assets.load('../assets/desert_tile.png')) as Texture;
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
    Assets.load('../assets/landscape/big_rock.png'),
    Assets.load('../assets/landscape/tiny_rock.png'),
    Assets.load('../assets/landscape/cactus_1.png'),
    Assets.load('../assets/landscape/cactus_2.png'),
    Assets.load('../assets/landscape/shrub.png'),
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

  for (let x = -GRID_SIZE; x < GRID_SIZE; x++) {
    for (let y = -GRID_SIZE; y < GRID_SIZE; y++) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      if (Math.random() > variant.spawnChance) continue;

      const isoX = (x - y) * (TILE_WIDTH / 2);
      const isoY = (x + y) * (TILE_HEIGHT / 2);

      const sprite = new Sprite(variant.texture);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(variant.scale);

      const jitterX = (Math.random() - 0.5) * 40;
      const jitterY = (Math.random() - 0.5) * 10;

      sprite.x = isoX + offsetX + jitterX;
      sprite.y = isoY + offsetY + jitterY;

      decorContainer.addChild(sprite);
    }
  }
}
