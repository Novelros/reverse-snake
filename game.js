class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gridSize = this.calculateGridSize();
        this.renderer = new Renderer(this.canvas, this.gridSize);
        this.tileCount = this.gridSize;
        this.baseFps = 12;
        this.selectedSpeed = 1;
        this.fps = this.baseFps * this.selectedSpeed;
        this.spawnLookaheadTicks = 6;
        
        this.scoreEl = document.getElementById('score');
        this.highscoreEl = document.getElementById('highscore');
        this.currentSpeedEl = document.getElementById('current-speed');
        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('start-btn');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlaySubtitle = document.getElementById('overlay-subtitle');
        this.pauseMenu = document.getElementById('pause-menu');
        this.resumeBtn = document.getElementById('resume-btn');
        this.speedButtons = document.querySelectorAll('.speed-option');
        
        this.elapsedTicks = 0;
        this.elapsedSeconds = 0;
        this.startedAt = 0;
        this.pauseStartedAt = 0;
        this.pausedTime = 0;
        this.highscore = Number(localStorage.getItem('rev_snake_result_highscore')) || 0;
        this.gameInterval = null;
        this.gameRunning = false;
        this.isPaused = false;
        
        this.player = { x: 0, y: 0, dx: 0, dy: 0 };
        this.snakes = [];
        
        // Таймеры для появления змей
        this.spawnTimers = {
            green: { timer: 0, interval: 0, count: 1 },
            yellow: { timer: 0, interval: 0, count: 1 },
            red: { timer: 0, interval: 0, count: 1 }
        };
        
        this.keys = {
            ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
            KeyW: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 },
            KeyA: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 }
        };
        
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        
        this.init();
    }
    
    calculateGridSize() {
        const width = window.innerWidth;
        if (width <= 400) return 20;
        if (width <= 768) return 22;
        return 24;
    }
    
    handleResize() {
        const newGridSize = this.calculateGridSize();
        if (newGridSize !== this.gridSize && !this.gameRunning) {
            this.gridSize = newGridSize;
            this.tileCount = newGridSize;
            this.renderer = new Renderer(this.canvas, this.gridSize);
            this.renderer.drawStartScreen();
            this.resetPlayerPosition();
        }
    }
    
    resetPlayerPosition() {
        this.player.x = Math.floor(this.tileCount / 2);
        this.player.y = Math.floor(this.tileCount / 2);
    }
    
    init() {
        this.highscoreEl.textContent = this.formatResult(this.highscore);
        this.scoreEl.textContent = this.formatTime(0);
        this.currentSpeedEl.textContent = this.formatSpeed(this.selectedSpeed);
        this.resetPlayerPosition();
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                if (this.gameRunning && !this.isPaused) {
                    this.pauseGame();
                } else if (this.isPaused) {
                    this.resumeGame();
                }
                return;
            }
            
            if (this.keys[e.code] && this.gameRunning && !this.isPaused) {
                e.preventDefault();
                this.player.dx = this.keys[e.code].x;
                this.player.dy = this.keys[e.code].y;
            }
        });
        
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.gameRunning && !this.isPaused) {
                    const key = btn.dataset.key;
                    if (this.keys[key]) {
                        this.player.dx = this.keys[key].x;
                        this.player.dy = this.keys[key].y;
                    }
                }
            });
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameRunning && !this.isPaused) {
                    const key = btn.dataset.key;
                    if (this.keys[key]) {
                        this.player.dx = this.keys[key].x;
                        this.player.dy = this.keys[key].y;
                    }
                }
            });
        });
        
        let lastShakeTime = 0;
        window.addEventListener('devicemotion', (e) => {
            const acceleration = e.accelerationIncludingGravity;
            if (!acceleration) return;
            
            const magnitude = Math.sqrt(
                acceleration.x * acceleration.x + 
                acceleration.y * acceleration.y + 
                acceleration.z * acceleration.z
            );
            
            const now = Date.now();
            if (magnitude > 25 && now - lastShakeTime > 1000) {
                lastShakeTime = now;
                if (this.gameRunning && !this.isPaused) {
                    this.pauseGame();
                }
            }
        });
        
        this.speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.gameRunning) return;
                this.selectSpeed(Number(btn.dataset.speed));
            });
        });
        
        this.startBtn.addEventListener('click', () => this.start());
        this.resumeBtn.addEventListener('click', () => this.resumeGame());
        this.renderer.drawStartScreen();
    }

    selectSpeed(speed) {
        this.selectedSpeed = speed;
        this.fps = this.baseFps * this.selectedSpeed;
        this.currentSpeedEl.textContent = this.formatSpeed(speed);

        this.speedButtons.forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.speed) === speed);
        });
    }

    formatTime(seconds) {
        return `${seconds.toFixed(1)}с`;
    }

    formatSpeed(speed) {
        return `${speed}x`;
    }

    formatResult(result) {
        return String(Math.floor(result)).padStart(4, '0');
    }

    calculateResult() {
        return Math.round(this.elapsedSeconds * this.selectedSpeed);
    }
    
    start() {
        this.resetPlayerPosition();
        this.player.dx = 0;
        this.player.dy = 0;
        this.elapsedTicks = 0;
        this.elapsedSeconds = 0;
        this.startedAt = performance.now();
        this.pauseStartedAt = 0;
        this.pausedTime = 0;
        this.scoreEl.textContent = this.formatTime(0);
        this.currentSpeedEl.textContent = this.formatSpeed(this.selectedSpeed);
        this.snakes = [];
        
        // Сбрасываем таймеры
        this.spawnTimers = {
            green: { timer: 0, interval: 40, count: 1 },
            yellow: { timer: 0, interval: 60, count: 1 },
            red: { timer: 0, interval: 100, count: 1 }
        };

        // Начальные змеи (2 зелёных)
        for (let i = 0; i < 2; i++) {
            this.spawnSnake('green');
        }

        this.overlay.classList.add('hidden');
        this.gameRunning = true;
        this.isPaused = false;
        clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }
    
    pauseGame() {
        this.isPaused = true;
        this.pauseStartedAt = performance.now();
        clearInterval(this.gameInterval);
        this.pauseMenu.classList.remove('hidden');
    }
    
    resumeGame() {
        this.isPaused = false;
        if (this.pauseStartedAt) {
            this.pausedTime += performance.now() - this.pauseStartedAt;
            this.pauseStartedAt = 0;
        }
        this.pauseMenu.classList.add('hidden');
        clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }
    
    updateSpawnTimers() {
        // Обновляем интервалы появления в зависимости от счёта
        if (this.elapsedTicks < 50) {
            this.spawnTimers.green.interval = 35;
            this.spawnTimers.green.count = 1;
            this.spawnTimers.yellow.interval = 0;
            this.spawnTimers.yellow.count = 0;
            this.spawnTimers.red.interval = 0;
            this.spawnTimers.red.count = 0;
        } else if (this.elapsedTicks < 80) {
            this.spawnTimers.green.interval = 30;
            this.spawnTimers.green.count = 1;
            this.spawnTimers.yellow.interval = 50;
            this.spawnTimers.yellow.count = 1;
            this.spawnTimers.red.interval = 0;
            this.spawnTimers.red.count = 0;
        } else if (this.elapsedTicks < 120) {
            this.spawnTimers.green.interval = 28;
            this.spawnTimers.green.count = 1;
            this.spawnTimers.yellow.interval = 40;
            this.spawnTimers.yellow.count = 1;
            this.spawnTimers.red.interval = 70;
            this.spawnTimers.red.count = 1;
        } else if (this.elapsedTicks < 160) {
            this.spawnTimers.green.interval = 25;
            this.spawnTimers.green.count = 2;
            this.spawnTimers.yellow.interval = 35;
            this.spawnTimers.yellow.count = 1;
            this.spawnTimers.red.interval = 60;
            this.spawnTimers.red.count = 1;
        } else if (this.elapsedTicks < 200) {
            this.spawnTimers.green.interval = 22;
            this.spawnTimers.green.count = 2;
            this.spawnTimers.yellow.interval = 30;
            this.spawnTimers.yellow.count = 2;
            this.spawnTimers.red.interval = 50;
            this.spawnTimers.red.count = 1;
        } else if (this.elapsedTicks < 250) {
            this.spawnTimers.green.interval = 20;
            this.spawnTimers.green.count = 2;
            this.spawnTimers.yellow.interval = 25;
            this.spawnTimers.yellow.count = 2;
            this.spawnTimers.red.interval = 40;
            this.spawnTimers.red.count = 1;
        } else {
            this.spawnTimers.green.interval = 18;
            this.spawnTimers.green.count = 2;
            this.spawnTimers.yellow.interval = 20;
            this.spawnTimers.yellow.count = 2;
            this.spawnTimers.red.interval = 35;
            this.spawnTimers.red.count = 2;
        }
        
        // Проверяем таймеры и спавним змей
        for (let type in this.spawnTimers) {
            if (this.spawnTimers[type].interval === 0) continue;
            
            this.spawnTimers[type].timer++;
            
            if (this.spawnTimers[type].timer >= this.spawnTimers[type].interval) {
                this.spawnTimers[type].timer = 0;
                
                const count = this.spawnTimers[type].count;
                const maxSnakes = type === 'green' ? 6 : (type === 'yellow' ? 5 : 3);
                const currentCount = this.snakes.filter(s => s.type === type).length;
                
                const toSpawn = Math.min(count, maxSnakes - currentCount);
                for (let i = 0; i < toSpawn; i++) {
                    this.spawnSnake(type);
                }
            }
        }
    }

    spawnSnake(type) {
        const occupiedByTick = this.getPredictedOccupiedCells(this.snakes, this.spawnLookaheadTicks);
        const starts = this.getShuffledSpawnStarts();

        for (let start of starts) {
            const candidate = new Snake(type, this.tileCount, start);
            if (this.isSafeSpawn(candidate, occupiedByTick)) {
                this.snakes.push(candidate);
                return true;
            }
        }

        return false;
    }

    getShuffledSpawnStarts() {
        const starts = [];
        const min = 2;
        const max = this.tileCount - 3;

        for (let x = min; x <= max; x++) {
            starts.push({ x, y: 0, dx: 0, dy: 1 });
            starts.push({ x, y: this.tileCount - 1, dx: 0, dy: -1 });
        }

        for (let y = min; y <= max; y++) {
            starts.push({ x: 0, y, dx: 1, dy: 0 });
            starts.push({ x: this.tileCount - 1, y, dx: -1, dy: 0 });
        }

        for (let i = starts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [starts[i], starts[j]] = [starts[j], starts[i]];
        }

        return starts;
    }

    isSafeSpawn(candidate, occupiedByTick) {
        const predictions = this.predictSnakeBodies(candidate, this.spawnLookaheadTicks);

        for (let tick = 0; tick < predictions.length; tick++) {
            for (let part of predictions[tick]) {
                if (!this.isInsideBoard(part)) continue;
                if (tick === 0 && this.player.x === part.x && this.player.y === part.y) return false;
                if (occupiedByTick[tick].has(this.cellKey(part))) return false;
            }
        }

        return true;
    }

    getPredictedOccupiedCells(snakes, ticks) {
        const occupiedByTick = Array.from({ length: ticks + 1 }, () => new Set());

        snakes.forEach(snake => {
            const predictions = this.predictSnakeBodies(snake, ticks);
            predictions.forEach((body, tick) => {
                body.forEach(part => {
                    if (this.isInsideBoard(part)) {
                        occupiedByTick[tick].add(this.cellKey(part));
                    }
                });
            });
        });

        return occupiedByTick;
    }

    predictSnakeBodies(snake, ticks) {
        const predictions = [];
        let body = snake.body.map(part => ({ ...part }));
        let moveTicket = snake.moveTicket;

        for (let tick = 0; tick <= ticks; tick++) {
            predictions.push(body.map(part => ({ ...part })));

            if (tick === ticks || body.length === 0 || snake.isDying) continue;

            moveTicket += 1;
            if (moveTicket >= snake.speedDivider) {
                moveTicket = 0;
                body = this.movePredictedBody(body, snake.dx, snake.dy);
            }
        }

        return predictions;
    }

    movePredictedBody(body, dx, dy) {
        const head = body[0];
        const newHead = { x: head.x + dx, y: head.y + dy };
        return [newHead, ...body.slice(0, -1).map(part => ({ ...part }))];
    }

    isInsideBoard(part) {
        return part.x >= 0 && part.x < this.tileCount && part.y >= 0 && part.y < this.tileCount;
    }

    cellKey(part) {
        return `${part.x},${part.y}`;
    }
    
    gameLoop() {
        if (this.isPaused) return;
        
        this.updatePlayer();
        if (!this.gameRunning) return;

        this.updateSnakes();
        this.checkSnakeCollisions();
        this.checkCollisions();
        
        if (this.gameRunning) {
            this.elapsedTicks++;
            this.updateElapsedTime();
            
            this.updateSpawnTimers();
            this.render();
        }
    }

    updateElapsedTime() {
        this.elapsedSeconds = (performance.now() - this.startedAt - this.pausedTime) / 1000;
        this.scoreEl.textContent = this.formatTime(this.elapsedSeconds);
    }
    
    updatePlayer() {
        this.player.x += this.player.dx;
        this.player.y += this.player.dy;

        if (this.player.x < 0 || this.player.x >= this.tileCount || 
            this.player.y < 0 || this.player.y >= this.tileCount) {
            this.gameOver("Вы врезались в стену");
        }
    }
    
    updateSnakes() {
        this.snakes = this.snakes.filter(snake => !snake.isGone() && !snake.isOutOfBounds(this.tileCount));
        this.snakes.forEach(snake => snake.update(this.player, this.tileCount));
        this.snakes = this.snakes.filter(snake => !snake.isGone() && !snake.isOutOfBounds(this.tileCount));
    }

    checkSnakeCollisions() {
        const cells = new Map();

        this.snakes.forEach(snake => {
            snake.body.forEach(part => {
                if (!this.isInsideBoard(part)) return;

                const key = this.cellKey(part);
                if (!cells.has(key)) cells.set(key, []);
                cells.get(key).push(snake);
            });
        });

        cells.forEach((cellSnakes, key) => {
            const uniqueSnakes = [...new Set(cellSnakes)];
            if (uniqueSnakes.length < 2) return;

            const [x, y] = key.split(',').map(Number);
            uniqueSnakes.forEach(snake => snake.markDying({ x, y }));
        });
    }
    
    checkCollisions() {
        for (let snake of this.snakes) {
            for (let part of snake.body) {
                if (this.isInsideBoard(part)) {
                    if (this.player.x === part.x && this.player.y === part.y) {
                        const names = {
                            green: 'зелёной',
                            yellow: 'жёлтой',
                            red: 'красной'
                        };
                        this.gameOver(`Вас съела ${names[snake.type]} змея`);
                        return;
                    }
                }
            }
        }
    }
    
    gameOver(reason) {
        this.updateElapsedTime();
        const finalResult = this.calculateResult();

        this.gameRunning = false;
        this.isPaused = false;
        clearInterval(this.gameInterval);

        if (finalResult > this.highscore) {
            this.highscore = finalResult;
            localStorage.setItem('rev_snake_result_highscore', this.highscore);
            this.highscoreEl.textContent = this.formatResult(this.highscore);
        }

        this.overlayTitle.textContent = "ИГРА ОКОНЧЕНА";
        this.overlaySubtitle.innerHTML = [
            reason,
            `<br><br>Время: <span style="color:#ff4444;">${this.formatTime(this.elapsedSeconds)}</span>`,
            `<br>Скорость: <span style="color:#44cc44;">${this.formatSpeed(this.selectedSpeed)}</span>`,
            `<br>Результат: <span style="color:#ffaa00;">${this.formatResult(finalResult)}</span>`
        ].join('');
        this.startBtn.textContent = "ИГРАТЬ СНОВА";
        this.overlay.classList.remove('hidden');
    }
    
    render() {
        this.renderer.clear();
        this.renderer.drawGrid();
        this.renderer.drawSnakes(this.snakes);
        this.renderer.drawPlayer(this.player);
    }
}

new Game();
