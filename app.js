const startButton = document.getElementById('start-game-btn');
const gridContainer = document.getElementById('grid-game-container');
const timerElement = document.querySelector('#timer');

let timerId = null;

const UNREVEAL_DELAY = 1000;
const ANIMATION_DURATION = 2000;

class Timer {
    constructor(duration, updateCb, finishCb) {
        this.duration = duration;
        this.updateCb = updateCb;
        this.finishCb = finishCb;
        this.isPaused = false;
        this.remainingTime = duration;
        timerId = null;
    }

    start() {
        timerId = setInterval(() => {
            if (!this.isPaused) {
                this.remainingTime--;
                this.updateCb(this.remainingTime);
                if (this.remainingTime <= 0) {
                    this.stop();
                    this.finishCb();
                }
            }
        }, 1000);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    stop() {
        clearInterval(timerId);
        this.remainingTime = this.duration;
        timerElement.textContent = this.duration;
    }
}

class MatchGrid {
    constructor({ width, height, theme }) {
        this.width = width;
        this.height = height;
        this.theme = theme;
        this.boardValues = this.renderBoardValues();
    }

    generatePairValues() {
        return Array.from({ length: (this.width * this.height) / 2 }, (_, i) => i + 1);
    }

    shufflePairs(pairValues) {
        const pairs = [...pairValues, ...pairValues];

        // Fisher-Yates algorithm
        for (let i = pairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
        }

        return pairs;
    }

    generateBoardMatrix(pairs) {
        return Array.from({ length: Math.ceil(pairs.length / this.height) }, (_, i) =>
            pairs.slice(i * this.height, i * this.height + this.height)
        );
    }

    renderBoardValues() {
        const pairValues = this.generatePairValues();
        const shuffledPairs = this.shufflePairs(pairValues);
        const boardMatrix = this.generateBoardMatrix(shuffledPairs);
        console.log(boardMatrix);
        return boardMatrix;
    }

    renderGrid() {
        const table = document.createElement('table');
        gridContainer.appendChild(table);

        for (let i = 0; i < this.width; i++) {
            const tr = document.createElement('tr');
            table.appendChild(tr);
            for (let j = 0; j < this.height; j++) {
                const td = document.createElement('td');
                Object.assign(td.style, {
                    width: this.theme.cellWidth,
                    height: this.theme.cellHeight,
                    backgroundColor: this.theme.backgroundColor,
                    color: this.theme.backgroundColor,
                });
                td.id = `${i}-${j}`;
                tr.appendChild(td);

                anime({
                    targets: td,
                    translateY: [100, 0],
                    opacity: [0, 1],
                    duration: 500,
                    delay: i * 50 + j * 50,
                    easing: 'easeOutExpo',
                });
            }
        }
    }
}

class GameController {
    constructor(matchGrid, { timeLimit }) {
        this.matchGrid = matchGrid;
        this.timer = new Timer(timeLimit, updateTime, () => this.endGame());
        this.firstCell = null;
        this.secondCell = null;
        this.score = 0;
        this.initMouseListeners();
    }

    startGame() {
        this.timer.start();
        this.matchGrid.renderGrid();
        this.listenCellsActions();
    }

    endGame = () => {
        gridContainer.textContent = null;
        timerElement.textContent = null;

        this.firstCell = null;
        this.secondCell = null;
        this.timer.stop();

        gridContainer.removeEventListener('click', this.handleOpenCard);
        document.addEventListener('mouseleave', this.pauseGame);
        document.addEventListener('mouseenter', this.resumeGame);

        const endGameTitle = document.createElement('div');
        endGameTitle.classList.add('start-game-btn');
        endGameTitle.textContent = `Game over! Score ${this.score}!!!`;
        gridContainer.appendChild(endGameTitle);
        setTimeout(() => {
            gridContainer.removeChild(endGameTitle);
            this.replayGame();
        }, ANIMATION_DURATION);
    };

    resumeGame = () => {
        this.timer.resume();
    };

    pauseGame = () => {
        this.timer.pause();
    };

    replayGame() {
        startButton.style.display = 'block';
    }

    initMouseListeners = () => {
        document.addEventListener('mouseleave', this.pauseGame);
        document.addEventListener('mouseenter', this.resumeGame);
    };

    listenCellsActions = () => {
        gridContainer.addEventListener('click', this.handleOpenCard);
    };

    getCellPosition = (cell) => {
        return cell.id.split('-').map((num) => parseInt(num));
    };

    getCellContent = (rowIdx, colIdx) => {
        return this.matchGrid.boardValues[rowIdx][colIdx];
    };

    setCellContent = (cell, content) => {
        cell.textContent = content;
    };

    doCellsMatch = (firstCell, secondCell) => {
        const [firstCellRowIdx, firstCellColIdx] = this.getCellPosition(firstCell);
        const [secondCellRowIdx, secondCellColIdx] = this.getCellPosition(secondCell);
        const firstCellContent = this.getCellContent(firstCellRowIdx, firstCellColIdx);
        const secondCellContent = this.getCellContent(secondCellRowIdx, secondCellColIdx);
        return firstCellContent === secondCellContent;
    };

    handleMatch = () => {
        this.score++;
        this.firstCell = null;
        this.secondCell = null;
        if (this.isGameFinished()) {
            this.endGame();
        }
    };

    handleMismatch = () => {
        setTimeout(() => {
            this.firstCell && this.firstCell.classList.remove('revealed');
            this.secondCell && this.secondCell.classList.remove('revealed');
            this.firstCell = null;
            this.secondCell = null;
        }, UNREVEAL_DELAY);
    };

    isGameFinished = () => {
        return this.score === (this.matchGrid.height * this.matchGrid.width) / 2;
    };

    handleOpenCard = (event) => {
        const cell = event.target;
        const isAllowed =
            cell.matches('td') && !cell.classList.contains('revealed') && (!this.firstCell || !this.secondCell);
        if (isAllowed) {
            cell.classList.add('revealed');

            if (!this.firstCell) {
                this.firstCell = cell;
                const [firstCellRowIdx, firstCellColIdx] = this.getCellPosition(cell);
                const firstCellContent = this.getCellContent(firstCellRowIdx, firstCellColIdx);
                this.setCellContent(cell, firstCellContent);
            } else {
                this.secondCell = cell;
                const [secondCellRowIdx, secondCellColIdx] = this.getCellPosition(cell);
                const secondCellContent = this.getCellContent(secondCellRowIdx, secondCellColIdx);
                this.setCellContent(cell, secondCellContent);

                if (this.doCellsMatch(this.firstCell, this.secondCell)) {
                    this.handleMatch();
                } else {
                    this.handleMismatch();
                }
            }
        }
    };
}

const args = {
    width: 4,
    height: 4,
    timeLimit: 5,
    theme: {
        backgroundColor: 'black',
        color: 'white',
        cellWidth: '50px',
        cellHeight: '50px',
        font: {
            size: 20,
        },
    },
};

const updateTime = (time) => {
    timerElement.textContent = time;
};

startButton.addEventListener('click', () => {
    startButton.style.display = 'none';

    const matchGrid = new MatchGrid(args);
    const gameController = new GameController(matchGrid, args);

    gameController.startGame();
});
