class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gridSize = this.calculateGridSize();
        this.renderer = new Renderer(this.canvas, this.gridSize);
        this.tileCount = this.gridSize;
        this.fps = 12;
        
        this.scoreEl = document.getElementById('score');
        this.highscoreEl = document.getElementById('highscore');
        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('start-btn');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlaySubtitle = document.getElementById('overlay-subtitle');
        this.pauseMenu = document.getElementById('pause-menu');
        this.resumeBtn = document.getElementById('resume-btn');
        
        this.score = 0;
        this.highscore = localStorage.getItem('rev_snake_highscore') || 0;
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
        this.highscoreEl.textContent = String(this.highscore).padStart(4, '0');
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
        
        this.startBtn.addEventListener('click', () => this.start());
        this.resumeBtn.addEventListener('click', () => this.resumeGame());
        this.renderer.drawStartScreen();
    }
    
    start() {
        this.resetPlayerPosition();
        this.player.dx = 0;
        this.player.dy = 0;
        this.score = 0;
        this.scoreEl.textContent = "0000";
        this.snakes = [];
        
        // Сбрасываем таймеры
        this.spawnTimers = {
            green: { timer: 0, interval: 40, count: 1 },
            yellow: { timer: 0, interval: 60, count: 1 },
            red: { timer: 0, interval: 100, count: 1 }
        };

        // Начальные змеи (2 зелёных)
        for (let i = 0; i < 2; i++) {
            this.snakes.push(new Snake('green', this.tileCount));
        }

        this.overlay.classList.add('hidden');
        this.gameRunning = true;
        this.isPaused = false;
        clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }
    
    pauseGame() {
        this.isPaused = true;
        clearInterval(this.gameInterval);
        this.pauseMenu.classList.remove('hidden');
    }
    
    resumeGame() {
        this.isPaused = false;
        this.pauseMenu.classList.add('hidden');
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }
    
    updateSpawnTimers() {
        // Обновляем интервалы появления в зависимости от счёта
        if (this.score < 50) {
            this.spawnTimers.green.interval = 35;
            this.spawnTimers.green.count = 1;
            this.spawnTimers.yellow.interval = 0;
            this.spawnTimers.yellow.count = 0;
            this.spawnTimers.red.interval = 0;
            this.spawnTimers.red.count = 0;
        } else if (this.score < 80) {
            this.spawnTimers.green.interval = 30;
            this.spawnTimers.green.count = 1;
            this.spawnTimers.yellow.interval = 50;
            this.spawnTimers.yellow.count = 1;
            this.spawnTimers.red.interval = 0;
            this.spawnTimers.red.count = 0;
        } else if (this.score < 120) {
            this.spawnTimers.green.interval = 28;
            this.spawnTimers.green.count = 1;
            this.spawnTimers.yellow.interval = 40;
            this.spawnTimers.yellow.count = 1;
            this.spawnTimers.red.interval = 70;
            this.spawnTimers.red.count = 1;
        } else if (this.score < 160) {
            this.spawnTimers.green.interval = 25;
            this.spawnTimers.green.count = 2;
            this.spawnTimers.yellow.interval = 35;
            this.spawnTimers.yellow.count = 1;
            this.spawnTimers.red.interval = 60;
            this.spawnTimers.red.count = 1;
        } else if (this.score < 200) {
            this.spawnTimers.green.interval = 22;
            this.spawnTimers.green.count = 2;
            this.spawnTimers.yellow.interval = 30;
            this.spawnTimers.yellow.count = 2;
            this.spawnTimers.red.interval = 50;
            this.spawnTimers.red.count = 1;
        } else if (this.score < 250) {
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
                    this.snakes.push(new Snake(type, this.tileCount));
                }
            }
        }
    }
    
    gameLoop() {
        if (this.isPaused) return;
        
        this.updatePlayer();
        if (!this.gameRunning) return;

        this.updateSnakes();
        this.checkCollisions();
        
        if (this.gameRunning) {
            this.score++;
            this.scoreEl.textContent = String(this.score).padStart(4, '0');
            
            this.updateSpawnTimers();
            this.render();
        }
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
        this.snakes = this.snakes.filter(snake => !snake.isOutOfBounds(this.tileCount));
        this.snakes.forEach(snake => snake.update(this.player, this.tileCount));
    }
    
    checkCollisions() {
        for (let snake of this.snakes) {
            for (let part of snake.body) {
                if (part.x >= 0 && part.x < this.tileCount && 
                    part.y >= 0 && part.y < this.tileCount) {
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
        this.gameRunning = false;
        this.isPaused = false;
        clearInterval(this.gameInterval);

        if (this.score > this.highscore) {
            this.highscore = this.score;
            localStorage.setItem('rev_snake_highscore', this.highscore);
            this.highscoreEl.textContent = String(this.highscore).padStart(4, '0');
        }

        this.overlayTitle.textContent = "ИГРА ОКОНЧЕНА";
        this.overlaySubtitle.innerHTML = `${reason}<br><br>Время жизни: <span style="color:#ff4444;">${this.score}</span>`;
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