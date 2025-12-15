export class UIOverlay {
  private element: HTMLDivElement;
  private onDiceRoll?: (value: number) => void;
  private onAnswer?: (answer: boolean) => void;
  private onGameStart?: (players: number) => void;
  private players?: {
    id: number;
    color: string;
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
      <div id="dice-input-section" class="nine-slice-border">
        <input type="number" id="dice-input" min="1" max="6" placeholder="1-6">
        <button id="submit-dice">Roll!</button>
      </div>
      <div id="question-section" class="nice-slice-border" style="display: none;">
        <h2>Question</h2>
        <p id="question-text"></p>
        <button id="answer-true" class="answer-btn">True</button>
        <button id="answer-false" class="answer-btn">False</button>
      </div>
      <div id="feedback-section" style="display: none;">
        <p id="feedback-text"></p>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const submitBtn = document.getElementById('submit-dice') as HTMLButtonElement;
    const diceInput = document.getElementById('dice-input') as HTMLInputElement;
    const trueBtn = document.getElementById('answer-true') as HTMLButtonElement;
    const falseBtn = document.getElementById('answer-false') as HTMLButtonElement;
    const startGameBtn = document.getElementById('start-game-button') as HTMLButtonElement;
    const addPlayerBtn = document.getElementById('add-player-button') as HTMLButtonElement;

    const menu = document.getElementById('main-menu') as HTMLDivElement;
    const gameInfo = document.getElementById('game-info') as HTMLDivElement;
    const diceInputSection = document.getElementById('dice-input-section') as HTMLDivElement;
    const playersContainer = menu.querySelector('.players') as HTMLDivElement;
    const playerDisplay = document.getElementById('player-display') as HTMLDivElement;

    addPlayerBtn?.addEventListener('click', () => {
      if ((this.players?.length ?? 0) < 4) {
        const newPlayer = document.createElement('div');
        const hue = Math.floor(Math.random() * 360);
        newPlayer.className = 'player';
        newPlayer.innerHTML = `<img src="../assets/user.svg" width="50" height="50" style="filter: hue-rotate(${hue}deg);" alt="Player ${(this.players?.length ?? 0) + 1}">`;
        playersContainer.prepend(newPlayer);

        const newPlayerDisplay = document.createElement('div');
        if ((this.players?.length ?? 0) === 0) newPlayerDisplay.classList.add('active');
        newPlayerDisplay.classList.add('player-info');
        newPlayerDisplay.innerHTML = `
              <img src="../assets/user.svg" width="30" height="30" style="filter: hue-rotate(${hue}deg);" alt="Player ${(this.players?.length ?? 0) + 1}">
              <progress value="100" max="100"></progress>
            `;
        playerDisplay.append(newPlayerDisplay);

        this.players?.push({ id: (this.players?.length ?? 0) + 1, color: `hue-rotate(${hue}deg)` });
      } else {
        alert('Maximum of 4 players reached.');
      }
    });

    startGameBtn?.addEventListener('click', () => {
      if (menu && gameInfo && diceInputSection) {
        menu.animate([{ top: '50%' }, { top: '-50%' }], {
          duration: 1000,
          fill: 'forwards',
          easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        }).onfinish = () => {
          menu.style.display = 'none';
          gameInfo.style.display = 'block';
          diceInputSection.style.display = 'block';
        };
      }
      this.onGameStart?.(this.players?.length ?? 0);
    });

    submitBtn?.addEventListener('click', () => {
      const value = parseInt(diceInput.value);
      if (value >= 1 && value <= 6) {
        this.onDiceRoll?.(value);
        diceInput.value = '';
      } else {
        alert('Please enter a number between 1 and 6');
      }
    });

    diceInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitBtn?.click();
      }
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
    const section = document.getElementById('dice-input-section');
    if (section) section.style.display = 'block';
  }

  hideDiceInput(): void {
    const section = document.getElementById('dice-input-section');
    if (section) section.style.display = 'none';
  }

  showQuestion(questionText: string): void {
    const section = document.getElementById('question-section');
    const text = document.getElementById('question-text');
    if (section && text) {
      text.textContent = questionText;
      section.style.display = 'block';
    }
  }

  hideQuestion(): void {
    const section = document.getElementById('question-section');
    if (section) section.style.display = 'none';
  }

  showFeedback(message: string, duration: number = 2000): void {
    const section = document.getElementById('feedback-section');
    const text = document.getElementById('feedback-text');
    if (section && text) {
      text.textContent = message;
      section.style.display = 'block';
      setTimeout(() => {
        section.style.display = 'none';
      }, duration);
    }
  }

  updatePlayerInfo(playerName: string, score: number): void {
    const info = document.getElementById('current-player-info');
    if (info) {
      info.textContent = `Current: ${playerName} | Score: ${score}`;
    }
  }

  setActivePlayer(index: number): void {
    const playerDisplays = document.querySelectorAll('#player-display .player-info');
    playerDisplays.forEach((pd, i) => {
      if (i === index) {
        pd.classList.add('active');
      } else {
        pd.classList.remove('active');
      }
    });
  }
}
