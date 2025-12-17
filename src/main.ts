import './style.css';
import { Application, ColorMatrixFilter } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Game } from './game';
import { createBackground } from './mapBuilder';

import { DecorationEditor } from './decorationEditor';

(async () => {
  const app = new Application();

  await app.init({
    resizeTo: window,
    background: '#000',
    antialias: true,
  });

  app.renderer.resolution = window.devicePixelRatio || 1;

  const root = document.getElementById('app');
  if (!root) throw new Error('Missing #app root element');

  root.appendChild(app.canvas);

  const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: 4000,
    worldHeight: 4000,
    events: app.renderer.events,
    stopPropagation: true,
  });

  app.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  viewport.drag().pinch().wheel().decelerate();
  viewport.clampZoom({ minScale: 0.5, maxScale: 2 });
  // viewport.clamp({ left: 0, right: 4000, top: 0, bottom: 4000 });

  // viewport.setZoom(1, true);
  app.stage.addChild(viewport);

  const nightFilter = new ColorMatrixFilter();
  nightFilter.night(0.3, false);
  nightFilter.brightness(0.6, false);
  viewport.filters = [nightFilter];

  await createBackground(app, viewport);

  // const editor = new DecorationEditor(app, viewport);
  // await editor.init();

  const game = new Game(app, viewport);
  await game.init();
})();
