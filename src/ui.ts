import Player from './player';
import userSvgUrl from '../assets/user.svg';

export class UIOverlay {
  private element: HTMLDivElement;
  private onDiceRoll?: (value: number) => void;
  private onAnswer?: (answer: boolean) => void;
  private onGameStart?: (players: number) => void;

  private players?: {
    id: number;
    hue: number;
  }[] = [];

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.id = 'ui-overlay';
    parent.appendChild(this.element);
    this.render();
  }

  render(): void {
    this.element.innerHTML = `
        <div id="main-menu" class="nine-slice-border">
      <h1>Pedro Páramo</h1>
      <div class="players">
      <button id="add-player-button">+</button>
        </div>
      <button id="start-game-button">Start Game</button>
    </div>
      <div id="game-info" class="nine-slice-border">
        <div id="player-display"></div>
      </div>
      <div id="dice-section" class="nine-slice-border">
        <button id="roll-dice-button">Roll Dice</button>
        <div id="dice-result" aria-live="polite"></div>
      </div>
      <div id="question-section" class="nine-slice-border">
        <h2>Question</h2>
        <p id="question-text"></p>
        <button id="answer-true" class="answer-btn">True</button>
        <button id="answer-false" class="answer-btn">False</button>
      </div>
      <div id="feedback-section">
        <p id="feedback-text"></p>
      </div>
      <div id="game-over" class="nine-slice-border">
        <h1>Leaderboard</h1>
        <div id="leaderboard"></div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const rollDiceBtn = document.getElementById('roll-dice-button') as HTMLButtonElement;
    const trueBtn = document.getElementById('answer-true') as HTMLButtonElement;
    const falseBtn = document.getElementById('answer-false') as HTMLButtonElement;
    const startGameBtn = document.getElementById('start-game-button') as HTMLButtonElement;
    const addPlayerBtn = document.getElementById('add-player-button') as HTMLButtonElement;

    const menu = document.getElementById('main-menu') as HTMLDivElement;
    const gameInfo = document.getElementById('game-info') as HTMLDivElement;
    const diceSection = document.getElementById('dice-section') as HTMLDivElement;
    const playersContainer = menu.querySelector('.players') as HTMLDivElement;
    const playerDisplay = document.getElementById('player-display') as HTMLDivElement;

    addPlayerBtn?.addEventListener('click', () => {
      if ((this.players?.length ?? 0) < 4) {
        const newPlayer = document.createElement('div');
        const hue = Math.floor(Math.random() * 360);
        newPlayer.className = 'player';
        newPlayer.innerHTML = `<img src="${userSvgUrl}" width="50" height="50" style="filter: hue-rotate(${hue}deg);" alt="Player ${(this.players?.length ?? 0) + 1}">`;
        playersContainer.prepend(newPlayer);

        const newPlayerDisplay = document.createElement('div');
        if ((this.players?.length ?? 0) === 0) newPlayerDisplay.classList.add('active');
        newPlayerDisplay.classList.add('player-info');
        newPlayerDisplay.innerHTML = `
              <img src="${userSvgUrl}" width="30" height="30" style="filter: hue-rotate(${hue}deg);" alt="Player ${(this.players?.length ?? 0) + 1}">
              <progress id="player-sanity-${(this.players?.length ?? 0) + 1}" value="100" max="100"></progress>
            `;
        playerDisplay.append(newPlayerDisplay);

        this.players?.push({ id: (this.players?.length ?? 0) + 1, hue: hue });
      } else {
        alert('Maximum of 4 players reached.');
      }
    });

    startGameBtn?.addEventListener('click', () => {
      if (menu && gameInfo && diceSection) {
        menu.animate([{ top: '50%' }, { top: '-50%' }], {
          duration: 1000,
          fill: 'forwards',
          easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        }).onfinish = () => {
          menu.style.display = 'none';
          gameInfo.style.display = 'block';
          diceSection.style.display = 'block';
        };
      }
      this.onGameStart?.(this.players?.length ?? 0);
    });

    rollDiceBtn?.addEventListener('click', () => {
      // rollDiceBtn.disabled = true;
      const value = Math.floor(Math.random() * 6) + 1;
      this.updateDiceResult(value);
      this.onDiceRoll?.(value);
    });

    trueBtn?.addEventListener('click', () => {
      this.onAnswer?.(true);
    });

    falseBtn?.addEventListener('click', () => {
      this.onAnswer?.(false);
    });

    addPlayerBtn.dispatchEvent(new Event('click')); //Add initial player
  }

  setDiceRollCallback(callback: (value: number) => void): void {
    this.onDiceRoll = callback;
  }

  setAnswerCallback(callback: (answer: boolean) => void): void {
    this.onAnswer = callback;
  }

  setGameStartCallback(callback: (players: number) => void): void {
    this.onGameStart = callback;
  }

  showDiceInput(): void {
    const section = document.getElementById('dice-section') as HTMLDivElement;
    if (section) section.style.display = 'block';
  }

  hideDiceInput(): void {
    const section = document.getElementById('dice-section') as HTMLDivElement;
    if (section) section.style.display = 'none';
  }

  hidePlayerInfo(): void {
    const info = document.getElementById('game-info') as HTMLDivElement;
    if (info) info.style.display = 'none';
  }

  showGameOver(players: Player[]): void {
    const gameOver = document.getElementById('game-over') as HTMLDivElement;
    const leaderboard = document.getElementById('leaderboard') as HTMLDivElement;

    const sorted = players
      .map((p, index) => ({ id: index + 1, sanity: p.sanity }))
      .sort((a, b) => b.sanity - a.sanity);

    if (gameOver && leaderboard) {
      gameOver.style.display = 'block';
      for (const p of sorted) {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        entry.innerHTML = ` 
        <img src="${userSvgUrl}" width="30" height="30" alt="Player ${p.id}" style="filter: hue-rotate(${this.players?.[p.id - 1]?.hue}deg);">
        <span>${p.sanity} Sanity</span>`;
        leaderboard.appendChild(entry);
      }
      gameOver.animate([{ top: '50%' }], {
        duration: 1000,
        fill: 'forwards',
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      });
    }
  }

  private updateDiceResult(value: number): void {
    const result = document.getElementById('dice-result') as HTMLDivElement;
    if (result) {
      result.textContent = `Rolled: ${value}`;
    }
  }

  showQuestion(questionText: string, playerSanity: number): void {
    const section = document.getElementById('question-section') as HTMLDivElement;
    const textContainer = document.getElementById('question-text') as HTMLParagraphElement;

    if (playerSanity <= 50) {
      questionText = this.scrambleText(questionText);
    }

    if (section && textContainer) {
      textContainer.textContent = questionText;
      section.style.display = 'block';
    }
  }

  private scrambleText(text: string): string {
    return text
      .split(' ')
      .map((word) => {
        if (word.length <= 3) return word;
        const middle = word.slice(1, -1).split('');
        for (let i = middle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [middle[i], middle[j]] = [middle[j], middle[i]];
        }
        return word[0] + middle.join('') + word[word.length - 1];
      })
      .join(' ');
  }

  hideQuestion(): void {
    const section = document.getElementById('question-section') as HTMLDivElement;
    if (section) section.style.display = 'none';
  }

  showFeedback(message: string): void {
    const rollDiceBtn = document.getElementById('roll-dice-button') as HTMLButtonElement;
    const section = document.getElementById('feedback-section') as HTMLDivElement;
    const text = document.getElementById('feedback-text') as HTMLParagraphElement;

    if (section && text) {
      text.textContent = message;
      section.style.display = 'block';
      setTimeout(() => {
        section.style.display = 'none';
        if (rollDiceBtn) rollDiceBtn.disabled = false;
      }, 2000);
    }
  }

  setActivePlayer(index: number): void {
    const playerDisplays = document.querySelectorAll(
      '#player-display .player-info'
    ) as NodeListOf<HTMLDivElement>;
    playerDisplays.forEach((pd, i) => {
      if (i === index) {
        pd.classList.add('active');
      } else {
        pd.classList.remove('active');
      }
    });
  }

  loseSanity(index: number): void {
    const overlay = document.getElementById('overlay') as HTMLDivElement;
    if (overlay) {
      overlay.animate(
        [
          { boxShadow: 'inset 0px 0px 10rem rgba(255, 65, 65, 0.8)' },
          { boxShadow: 'inset 0px 0px 10rem rgba(0, 0, 0, 0.8)' },
        ],
        {
          duration: 1500,
          easing: 'ease-out',
        }
      );
    }
    const sanityBar = document.getElementById(`player-sanity-${index + 1}`) as HTMLProgressElement;
    if (sanityBar) {
      for (let i = 0; i < 25; i++) {
        setTimeout(() => {
          sanityBar.value = Math.max(0, sanityBar.value - 1);
        }, 20 * i);
      }
    }
  }

  handlePlayerDead(index: number): void {
    const playerDisplays = document.querySelectorAll('.player-info') as NodeListOf<HTMLDivElement>;
    const pd = playerDisplays[index];
    if (pd) {
      pd.classList.add('dead');
    }
  }
}
