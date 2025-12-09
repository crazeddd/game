export class UIOverlay {
  private element: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.id = 'ui-overlay';
    parent.appendChild(this.element);
    this.render();
  }

  render(): void {
    this.element.innerHTML = `
      <h1>Players</h1>
      <p>Filler text too see how this font displays.</p>
    `;
  }
}
