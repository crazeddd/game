import './style.css';
import { Application, Sprite, Texture } from 'pixi.js';
import { Game } from './game';

async function bootstrap(): Promise<void> {

    const app = new Application({
        resizeTo: window,
        background: '#0b1021',
        antialias: true,
    });

    let backgroundTexture = Texture.from("../assets/image.png");
    let background = new Sprite(backgroundTexture); 
    background.height = app.screen.height;
    background.width = app.screen.width;
    background.tint = 0x223344;
    app.stage.addChild(background);

    const host = document.getElementById('app');
    if (!host) throw new Error('Missing #app root element');
    host.appendChild(app.view as HTMLCanvasElement);

    const game = new Game(app);
    await game.init();
}

bootstrap().catch((error) => console.error(error));
