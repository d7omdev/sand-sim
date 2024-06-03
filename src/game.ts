import * as PIXI from 'pixi.js';

const pixi = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x212121,
});
document.body.appendChild(pixi.view);

export enum ParticleType {
  Sand,
}

abstract class Particle {
  public square: PIXI.Graphics;
  public filled: boolean;
  public color: number;

  constructor(
    public x: number,
    public y: number,
    public w: number,
    color: number
  ) {
    this.color = color;
    this.square = new PIXI.Graphics();
    this.square.drawRect(0, 0, w, w);
    this.square.x = x;
    this.square.y = y;
    this.square.interactive = true;
    this.square.buttonMode = true;
    this.filled = false;
    this.square.on('pointerdown', () => {
      this.setColor(currentColor);
      this.fill();
    });
  }

  addToStage(stage: PIXI.Container) {
    stage.addChild(this.square);
  }

  setColor(color: number) {
    this.color = color;
  }

  abstract fill(): void;

  abstract clear(): void;
}

const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
const resetBtn = document.getElementById('reset-color') as HTMLButtonElement;
let defaultColor = 0xe2c044;
let currentColor: number = defaultColor;

colorPicker.addEventListener('input', () => {
  currentColor = parseInt(colorPicker.value.slice(1), 16);
});
resetBtn.addEventListener('click', () => {
  currentColor = defaultColor;
});

class Sand extends Particle {
  fill() {
    this.square.clear();
    this.square.beginFill(this.color);
    this.square.drawRect(0, 0, this.w, this.w);
    this.square.endFill();
    this.filled = true;
  }

  clear() {
    this.square.clear();
    this.square.drawRect(0, 0, this.w, this.w);
    this.square.endFill();
    this.filled = false;
  }
}

let w: number = 4;
let cols: number = Math.floor(pixi.renderer.width / w);
let rows: number = Math.floor(pixi.renderer.height / w);
let grid: Particle[][] = Array.from({ length: cols }, () =>
  Array(rows).fill(null)
);

let particleType: ParticleType = ParticleType.Sand;

for (let i = 0; i < cols; i++) {
  for (let j = 0; j < rows; j++) {
    let color = defaultColor;
    switch (particleType) {
      case ParticleType.Sand:
        grid[i][j] = new Sand(i * w, j * w, w, color);
        break;
      // Other particle types here
    }
    grid[i][j].addToStage(pixi.stage);
  }
}

let isDragging = false;

const brushSize = document.getElementById('brush-size') as HTMLInputElement;
let drawRadius: number = 4;

brushSize.addEventListener('input', () => {
  drawRadius = brushSize.valueAsNumber;
});

// Create a new Graphics object for the circle
let circle = new PIXI.Graphics();
pixi.stage.addChild(circle);

function draw(e: MouseEvent | TouchEvent) {
  const rect = pixi.view.getBoundingClientRect();
  const clientX =
    (e as MouseEvent).clientX ?? (e as TouchEvent).touches[0].clientX;
  const clientY =
    (e as MouseEvent).clientY ?? (e as TouchEvent).touches[0].clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const mouseX = Math.floor(x / w);
  const mouseY = Math.floor(y / w);

  // Calculate the bounds of the circle
  const minX = Math.max(0, mouseX - drawRadius);
  const maxX = Math.min(cols, mouseX + drawRadius);
  const minY = Math.max(0, mouseY - drawRadius);
  const maxY = Math.min(rows, mouseY + drawRadius);

  // Only iterate over the cells within the bounds
  for (let i = minX; i < maxX; i++) {
    for (let j = minY; j < maxY; j++) {
      const dx = i - mouseX;
      const dy = j - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= drawRadius) {
        grid[i][j].setColor(currentColor);
        grid[i][j].fill();
      }
    }
  }
}

function drawCircle(e: MouseEvent | TouchEvent) {
  const rect = pixi.view.getBoundingClientRect();
  const clientX =
    (e as MouseEvent).clientX ?? (e as TouchEvent).touches[0].clientX;
  const clientY =
    (e as MouseEvent).clientY ?? (e as TouchEvent).touches[0].clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  // Clear the previous circle
  circle.clear();
  // Draw a new circle at the mouse position
  // circle.lineStyle(1, 0xffffff);
  circle.beginFill(0xffffff, 0.2);
  circle.drawCircle(x, y, drawRadius * w);
}

pixi.view.addEventListener('mousedown', () => (isDragging = true));
pixi.view.addEventListener('mousemove', (event) => {
  if (isDragging) draw(event);
  drawCircle(event);
});
pixi.view.addEventListener('mouseup', () => (isDragging = false));

pixi.view.addEventListener('touchstart', () => (isDragging = true));
pixi.view.addEventListener('touchmove', (event) => {
  if (isDragging) draw(event);
  drawCircle(event);
});
pixi.view.addEventListener('touchend', () => (isDragging = false));

const gravityRange = document.getElementById('gravity') as HTMLInputElement;
let gravity = 0.9;
gravityRange.addEventListener('input', () => {
  gravity = gravityRange.valueAsNumber;
});

function fall() {
  for (let i = 0; i < cols; i++) {
    for (let j = rows - 2; j >= 0; j--) {
      const square = grid[i][j];
      const belowSquare = grid[i][j + 1];
      if (square.filled && !belowSquare.filled && Math.random() < gravity) {
        square.clear();
        belowSquare.setColor(square.color); // Pass the color to the below square
        belowSquare.fill();
      }
    }
  }
}

function glide() {
  for (let i = 0; i < cols; i++) {
    for (let j = rows - 1; j >= 0; j--) {
      const square = grid[i][j];
      if (square.filled) {
        const belowSquare = j + 1 < rows ? grid[i][j + 1] : null;
        if (belowSquare && belowSquare.filled) {
          const randomDirection = Math.random() < 0.5 ? -1 : 1;
          const nextSquareIndex = i + randomDirection;
          if (nextSquareIndex >= 0 && nextSquareIndex < cols) {
            const nextSquare = grid[nextSquareIndex][j];
            const belowNextSquare =
              j + 1 < rows ? grid[nextSquareIndex][j + 1] : null;
            if (
              !nextSquare.filled &&
              (!belowNextSquare || !belowNextSquare.filled)
            ) {
              square.clear();
              nextSquare.setColor(square.color);
              nextSquare.fill();
            }
          }
        }
      }
    }
  }
}

const clearBtn = document.getElementById('clear-grid') as HTMLButtonElement;

function clearGrid() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      grid[i][j].clear();
    }
  }
}

clearBtn.addEventListener('click', clearGrid);

function gameLoop() {
  fall();
  glide();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
