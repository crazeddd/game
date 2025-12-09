export type Direction = 'up' | 'down' | 'left' | 'right';

export class Input {
  private keys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  isPressed(direction: Direction): boolean {
    const keyMap: Record<Direction, string[]> = {
      up: ['w', 'arrowup'],
      down: ['s', 'arrowdown'],
      left: ['a', 'arrowleft'],
      right: ['d', 'arrowright'],
    };

    return keyMap[direction].some((k) => this.keys.has(k));
  }
}
