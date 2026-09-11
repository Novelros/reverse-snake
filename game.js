class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.tileCount = this.calculateTileCount();
        this.renderer = new Renderer(this.canvas, this.tileCount);

        this.scoreEl = document.getElementById('score');
        this.highscoreEl = document.getElementById('highscore');
        this.livesEl = document.getElementById('lives');
        this.timeEl = document.getElementById('time');
        this.currentSpeedEl = document.getElementById('current-speed');
        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('start-btn');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlaySubtitle = document.getElementById('overlay-subtitle');
        this.pauseMenu = document.getElementById('pause-menu');
        this.resumeBtn = document.getElementById('resume-btn');
        this.rulesModal = document.getElementById('rules-modal');
        this.rulesBtn = document.getElementById('rules-btn');
        this.pauseRulesBtn = document.getElementById('pause-rules-btn');
        this.rulesBackBtn = document.getElementById('rules-back-btn');

        this.bossBtn = document.getElementById('boss-btn');
        this.menuMain = document.getElementById('menu-main');
        this.menuSpeed = document.getElementById('menu-speed');
        this.confirmBtn = document.getElementById('confirm-btn');
        this.speedBackBtn = document.getElementById('speed-back-btn');
        this.pendingMode = 'survival';
        this.bossHud = document.getElementById('boss-hud');
        this.bossPhaseEl = document.getElementById('boss-phase-text');
        this.bossCanvas = document.getElementById('bossCanvas');
        this.recordsModal = document.getElementById('records-modal');
        this.recordsBtn = document.getElementById('records-btn');
        this.recordsBackBtn = document.getElementById('records-back-btn');
        this.recordSurvivalEl = document.getElementById('record-survival');
        this.recordBossEl = document.getElementById('record-boss');

        this.mode = 'survival';
        this.boss = null;
        this.bossBestTime = Number(localStorage.getItem('rev_snake_boss_best_time')) || null;

        this.score = 0;
        this.highscore = localStorage.getItem('rev_snake_highscore') || 0;
        this.gameInterval = null;
        this.gameRunning = false;
        this.isPaused = false;
        this.speedMultiplier = 1;

        this.spawnLookaheadTicks = 6;

        this.startingLives = 3;
        this.lives = this.startingLives;
        this.pickup = null;
        this.pickupTimer = 0;

        this.SHIELD_DURATION_SEC = 3;
        this.INVISIBILITY_DURATION_SEC = 4;
        this.WORM_WARNING_TICKS = 25;
        this.MAX_WORMS = 2;

        this.startTime = 0;
        this.pauseStartedAt = null;

        this.wormWarnings = [];

        this.player = {
            x: 0, y: 0, dx: 0, dy: 0, animFrame: 0,
            shielded: false, shieldUntil: 0,
            invisible: false, invisibleUntil: 0,
            sizeScale: 1, crowned: false
        };
        this.snakes = [];

        this.difficultyStages = [
            { score: 0,   fps: 8,  green: { interval: 45, count: 1 }, yellow: { interval: 0,  count: 0 }, red: { interval: 0,  count: 0 }, worm: { interval: 0,   count: 0 } },
            { score: 50,  fps: 9,  green: { interval: 38, count: 1 }, yellow: { interval: 65, count: 1 }, red: { interval: 0,  count: 0 }, worm: { interval: 0,   count: 0 } },
            { score: 80,  fps: 10, green: { interval: 34, count: 1 }, yellow: { interval: 55, count: 1 }, red: { interval: 90, count: 1 }, worm: { interval: 110, count: 1 } },
            { score: 120, fps: 10, green: { interval: 30, count: 1 }, yellow: { interval: 48, count: 1 }, red: { interval: 80, count: 1 }, worm: { interval: 100, count: 1 } },
            { score: 160, fps: 11, green: { interval: 28, count: 2 }, yellow: { interval: 42, count: 1 }, red: { interval: 70, count: 1 }, worm: { interval: 90,  count: 1 } },
            { score: 200, fps: 11, green: { interval: 25, count: 2 }, yellow: { interval: 36, count: 2 }, red: { interval: 60, count: 1 }, worm: { interval: 80,  count: 1 } },
            { score: 250, fps: 12, green: { interval: 22, count: 2 }, yellow: { interval: 30, count: 2 }, red: { interval: 50, count: 2 }, worm: { interval: 70,  count: 2 } }
        ];
        this.currentStageLevel = 1;

        this.spawnTimers = {
            green: { timer: 0, interval: 0, count: 0 },
            yellow: { timer: 0, interval: 0, count: 0 },
            red: { timer: 0, interval: 0, count: 0 },
            worm: { timer: 0, interval: 0, count: 0 }
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

    calculateTileCount() {
        const width = window.innerWidth;
        if (width <= 400) return 24;
        if (width <= 768) return 28;
        return 32;
    }

    handleResize() {
        const newTileCount = this.calculateTileCount();
        if (!this.gameRunning) {
            this.tileCount = newTileCount;
            this.renderer.resize(this.tileCount);
            this.renderer.drawStartScreen();
            this.resetPlayerPosition();
        }
    }

    resetPlayerPosition() {
        this.player.x = Math.floor(this.tileCount / 2);
        this.player.y = Math.floor(this.tileCount / 2);
    }

    openSpeedMenu(mode) {
        this.pendingMode = mode;
        this.menuMain.classList.add('hidden');
        this.menuSpeed.classList.remove('hidden');
    }

    resetMenuToMain() {
        this.menuSpeed.classList.add('hidden');
        this.menuMain.classList.remove('hidden');
    }

    init() {
        this.highscoreEl.textContent = String(this.highscore).padStart(4, '0');
        this.resetPlayerPosition();

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                if (!this.recordsModal.classList.contains('hidden')) {
                    this.recordsModal.classList.add('hidden');
                } else if (!this.rulesModal.classList.contains('hidden')) {
                    this.rulesModal.classList.add('hidden');
                } else if (this.gameRunning && !this.isPaused) {
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

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.speedMultiplier = parseFloat(btn.dataset.speed);
                this.currentSpeedEl.textContent = this.formatSpeed(this.speedMultiplier);
            });
        });

        this.rulesBtn.addEventListener('click', () => this.rulesModal.classList.remove('hidden'));
        this.pauseRulesBtn.addEventListener('click', () => this.rulesModal.classList.remove('hidden'));
        this.rulesBackBtn.addEventListener('click', () => this.rulesModal.classList.add('hidden'));

        this.recordsBtn.addEventListener('click', () => {
            this.updateRecordsDisplay();
            this.recordsModal.classList.remove('hidden');
        });
        this.recordsBackBtn.addEventListener('click', () => this.recordsModal.classList.add('hidden'));

        this.bossBtn.addEventListener('click', () => this.openSpeedMenu('boss'));

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

        this.startBtn.addEventListener('click', () => this.openSpeedMenu('survival'));
        this.speedBackBtn.addEventListener('click', () => {
            this.menuSpeed.classList.add('hidden');
            this.menuMain.classList.remove('hidden');
        });
        this.confirmBtn.addEventListener('click', () => {
            if (this.pendingMode === 'boss') this.startBossFight();
            else this.start();
        });
        this.resumeBtn.addEventListener('click', () => this.resumeGame());

        this.currentSpeedEl.textContent = this.formatSpeed(this.speedMultiplier);
        this.playIntro();
    }

    playIntro() {
        const cx = Math.floor(this.tileCount / 2);
        const cy = Math.floor(this.tileCount / 2);
        const introApple = { x: cx, y: cy, dx: 0, dy: 0, animFrame: 0 };

        const timeouts = [];
        const schedule = (fn, delay) => timeouts.push(setTimeout(fn, delay));

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            timeouts.forEach(clearTimeout);
            this.canvas.removeEventListener('click', finish);
            this.overlay.classList.remove('hidden');
        };
        this.canvas.addEventListener('click', finish);

        const drawBase = () => {
            this.renderer.clear();
            this.renderer.drawGrid();
        };

        drawBase();
        this.renderer.drawPlainApple(introApple);

        schedule(() => {
            drawBase();
            this.renderer.drawPlainApple(introApple);
            this.renderer.drawDrop(cx, cy - 2.5);
        }, 500);
        schedule(() => {
            drawBase();
            this.renderer.drawPlainApple(introApple);
            this.renderer.drawDrop(cx, cy - 1);
        }, 750);

        schedule(() => {
            drawBase();
            this.renderer.drawSplash(cx, cy);
        }, 950);

        schedule(() => {
            drawBase();
            this.renderer.drawPlayer(introApple);
        }, 1150);

        const snakeSteps = 4;
        for (let i = 0; i <= snakeSteps; i++) {
            schedule(() => {
                drawBase();
                this.renderer.drawIntroSnake(cx, cy, i, snakeSteps, this.tileCount);
                this.renderer.drawPlayer(introApple);
            }, 1400 + i * 150);
        }

        schedule(finish, 1400 + (snakeSteps + 1) * 150);
    }

    start() {
        this.mode = 'survival';
        this.bossHud.classList.add('hidden');
        this.bossCanvas.classList.add('hidden');

        this.resetPlayerPosition();
        this.player.dx = 0;
        this.player.dy = 0;
        this.player.animFrame = 0;
        this.player.shielded = false;
        this.player.shieldUntil = 0;
        this.player.invisible = false;
        this.player.invisibleUntil = 0;
        this.player.sizeScale = 1;
        this.player.crowned = false;
        this.score = 0;
        this.currentStageLevel = 1;
        this.scoreEl.textContent = "0000";
        this.lives = this.startingLives;
        this.livesEl.textContent = String(this.lives);
        this.pickup = null;
        this.pickupTimer = 0;
        this.snakes = [];
        this.wormWarnings = [];
        this.startTime = Date.now();
        this.pauseStartedAt = null;
        this.timeEl.textContent = "0:00";

        this.spawnTimers = {
            green: { timer: 0, interval: 0, count: 0 },
            yellow: { timer: 0, interval: 0, count: 0 },
            red: { timer: 0, interval: 0, count: 0 },
            worm: { timer: 0, interval: 0, count: 0 }
        };

        for (let i = 0; i < 2; i++) {
            this.snakes.push(new Snake('green', this.tileCount));
        }

        this.overlay.classList.add('hidden');
        this.gameRunning = true;
        this.isPaused = false;
        this.fps = Math.round(this.difficultyStages[0].fps * this.speedMultiplier);
        clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }

    pauseGame() {
        this.isPaused = true;
        this.pauseStartedAt = Date.now();
        clearInterval(this.gameInterval);
        this.pauseMenu.classList.remove('hidden');
    }

    resumeGame() {
        this.isPaused = false;

        if (this.pauseStartedAt) {
            const pausedFor = Date.now() - this.pauseStartedAt;
            this.startTime += pausedFor;
            if (this.player.shieldUntil) this.player.shieldUntil += pausedFor;
            if (this.player.invisibleUntil) this.player.invisibleUntil += pausedFor;
            this.pauseStartedAt = null;
        }

        this.pauseMenu.classList.add('hidden');
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }

    updateDifficulty() {
        let stageIndex = 0;
        for (let i = 0; i < this.difficultyStages.length; i++) {
            if (this.score >= this.difficultyStages[i].score) stageIndex = i;
            else break;
        }

        const stage = this.difficultyStages[stageIndex];
        this.currentStageLevel = stageIndex + 1;

        this.spawnTimers.green.interval = stage.green.interval;
        this.spawnTimers.green.count = stage.green.count;
        this.spawnTimers.yellow.interval = stage.yellow.interval;
        this.spawnTimers.yellow.count = stage.yellow.count;
        this.spawnTimers.red.interval = stage.red.interval;
        this.spawnTimers.red.count = stage.red.count;
        this.spawnTimers.worm.interval = stage.worm.interval;
        this.spawnTimers.worm.count = stage.worm.count;

        const targetFps = Math.round(stage.fps * this.speedMultiplier);
        if (targetFps !== this.fps) {
            this.fps = targetFps;
            clearInterval(this.gameInterval);
            this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
        }

        for (let type in this.spawnTimers) {
            if (this.spawnTimers[type].interval === 0) continue;

            this.spawnTimers[type].timer++;

            if (this.spawnTimers[type].timer >= this.spawnTimers[type].interval) {
                this.spawnTimers[type].timer = 0;

                const count = this.spawnTimers[type].count;

                if (type === 'worm') {
                    const currentWorms = this.snakes.filter(s => s.type === 'worm').length + this.wormWarnings.length;
                    const toQueue = Math.min(count, this.MAX_WORMS - currentWorms);
                    for (let i = 0; i < toQueue; i++) this.queueWormWarning();
                    continue;
                }

                const maxSnakes = type === 'green' ? 5 : (type === 'yellow' ? 4 : 3);
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
        let emerging = snake.emerging;

        for (let tick = 0; tick <= ticks; tick++) {
            predictions.push(body.map(part => ({ ...part })));
            if (tick === ticks || body.length === 0) continue;

            moveTicket += 1;
            if (moveTicket >= snake.speedDivider) {
                moveTicket = 0;
                const head = body[0];
                const newHead = { x: head.x + snake.dx, y: head.y + snake.dy };
                body = [newHead, ...body];

                if (emerging && body.length >= snake.maxLength) {
                    emerging = false;
                } else if (!emerging) {
                    body.pop();
                }
            }
        }
        return predictions;
    }

    isInsideBoard(part) {
        return part.x >= 0 && part.x < this.tileCount && part.y >= 0 && part.y < this.tileCount;
    }

    cellKey(part) {
        return `${part.x},${part.y}`;
    }

    gameLoop() {
        if (this.isPaused) return;

        const now = Date.now();
        this.player.shielded = now < this.player.shieldUntil;
        this.player.invisible = now < this.player.invisibleUntil;

        this.updatePlayer();
        if (!this.gameRunning) return;

        this.updateSnakes();
        this.checkCollisions();

        if (this.gameRunning) {
            if (this.mode === 'boss') {
                this.boss.update();
            } else {
                this.updatePickup();

                this.score += this.currentStageLevel;
                this.scoreEl.textContent = String(this.score).padStart(4, '0');

                this.updateDifficulty();

                this.currentSpeedEl.textContent = this.formatSpeed(this.fps / this.difficultyStages[0].fps);
            }

            if (!this.gameRunning) return;

            this.timeEl.textContent = this.formatTime(now - this.startTime);
            this.render();
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    formatSpeed(speed) {
        return `${Math.round(speed * 100) / 100}x`;
    }

    updateRecordsDisplay() {
        this.recordSurvivalEl.textContent = String(this.highscore).padStart(4, '0');
        this.recordBossEl.textContent = this.bossBestTime ? this.formatTime(this.bossBestTime) : '—';
    }

    updatePlayer() {
        if (this.player.dx !== 0 || this.player.dy !== 0) {
            this.player.animFrame = 1 - this.player.animFrame;
        }

        this.player.x += this.player.dx;
        this.player.y += this.player.dy;

        const outOfBounds = this.player.x < 0 || this.player.x >= this.tileCount ||
            this.player.y < 0 || this.player.y >= this.tileCount;

        if (outOfBounds) {
            if (this.player.shielded) {
                this.player.x = Math.max(0, Math.min(this.tileCount - 1, this.player.x));
                this.player.y = Math.max(0, Math.min(this.tileCount - 1, this.player.y));
                this.player.dx = 0;
                this.player.dy = 0;
            } else {
                this.loseLife("Вы врезались в стену");
            }
        }
    }

    queueWormWarning() {
        for (let attempt = 0; attempt < 20; attempt++) {
            const x = Math.floor(Math.random() * this.tileCount);
            const y = Math.floor(Math.random() * this.tileCount);

            const onPlayer = this.player.x === x && this.player.y === y;
            const onSnake = this.snakes.some(s => s.body.some(p => p.x === x && p.y === y));
            const onWarning = this.wormWarnings.some(w => w.x === x && w.y === y);

            if (!onPlayer && !onSnake && !onWarning) {
                this.wormWarnings.push({ x, y, ticksLeft: this.WORM_WARNING_TICKS });
                return;
            }
        }
    }

    updateWormWarnings() {
        for (let i = this.wormWarnings.length - 1; i >= 0; i--) {
            const warning = this.wormWarnings[i];
            warning.ticksLeft--;
            if (warning.ticksLeft <= 0) {
                this.spawnWorm(warning.x, warning.y);
                this.wormWarnings.splice(i, 1);
            }
        }
    }

    spawnWorm(x, y) {
        const diffX = this.player.x - x;
        const diffY = this.player.y - y;
        let dx, dy;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            dx = diffX >= 0 ? 1 : -1;
            dy = 0;
        } else {
            dy = diffY >= 0 ? 1 : -1;
            dx = 0;
        }

        const candidate = new Snake('worm', this.tileCount, { x, y, dx, dy });
        const overlaps = this.snakes.some(s =>
            s.body.some(p => candidate.body.some(cp => cp.x === p.x && cp.y === p.y))
        );
        if (!overlaps) this.snakes.push(candidate);
    }

    updateSnakes() {
        this.snakes = this.snakes.filter(snake => !snake.isOutOfBounds(this.tileCount));
        this.updateWormWarnings();

        const snapshot = this.snakes.map(s => s.body.slice());

        this.snakes.forEach((snake, i) => {
            const obstacles = [];
            snapshot.forEach((body, j) => {
                if (j === i) return;
                obstacles.push(...body);
            });
            snake.update(this.player, this.tileCount, obstacles);
        });
    }

    checkCollisions() {
        if (this.player.shielded) return;

        for (let snake of this.snakes) {
            for (let part of snake.body) {
                if (part.x >= 0 && part.x < this.tileCount &&
                    part.y >= 0 && part.y < this.tileCount) {
                    if (this.player.x === part.x && this.player.y === part.y) {
                        const reasons = {
                            green: 'Вас съела зелёная змея',
                            yellow: 'Вас съела жёлтая змея',
                            red: 'Вас съела красная змея',
                            worm: 'Вас съел червь'
                        };
                        this.loseLife(reasons[snake.type]);
                        return;
                    }
                }
            }
        }
    }

    updatePickup() {
        if (!this.pickup) {
            this.pickupTimer++;
            if (this.pickupTimer >= 200) {
                this.pickupTimer = 0;
                this.spawnPickup();
            }
            return;
        }

        if (this.player.x === this.pickup.x && this.player.y === this.pickup.y) {
            this.collectPickup(this.pickup.type);
            this.pickup = null;
        }
    }

    spawnPickup() {
        for (let attempt = 0; attempt < 20; attempt++) {
            const x = Math.floor(Math.random() * this.tileCount);
            const y = Math.floor(Math.random() * this.tileCount);

            const onPlayer = this.player.x === x && this.player.y === y;
            const onSnake = this.snakes.some(s => s.body.some(p => p.x === x && p.y === y));

            if (!onPlayer && !onSnake) {
                this.pickup = { x, y, type: this.randomPickupType() };
                return;
            }
        }
    }

    randomPickupType() {
        const roll = Math.random();
        if (roll < 0.2) return 'life';
        if (roll < 0.6) return 'shield';
        return 'invisible';
    }

    collectPickup(type) {
        if (type === 'life') {
            this.lives++;
            this.livesEl.textContent = String(this.lives);
        } else if (type === 'shield') {
            this.player.shieldUntil = Date.now() + this.SHIELD_DURATION_SEC * 1000;
        } else if (type === 'invisible') {
            this.player.invisibleUntil = Date.now() + this.INVISIBILITY_DURATION_SEC * 1000;
        }
    }

    loseLife(reason) {
        this.lives--;
        this.livesEl.textContent = String(Math.max(this.lives, 0));

        if (this.lives <= 0) {
            if (this.mode === 'boss') {
                this.bossDefeat(reason);
            } else {
                this.gameOver(reason);
            }
        } else {
            this.resetPlayerPosition();
            this.player.dx = 0;
            this.player.dy = 0;
            this.player.animFrame = 0;

            this.player.shieldUntil = Date.now() + this.SHIELD_DURATION_SEC * 1000;
            this.player.shielded = true;
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

        const elapsed = this.formatTime(Date.now() - this.startTime);
        this.overlayTitle.textContent = "ИГРА ОКОНЧЕНА";
        this.overlaySubtitle.innerHTML = `${reason}<br><br>Очки: <span style="color:#ff4444;">${this.score}</span><br>Время: <span style="color:#66ccff;">${elapsed}</span>`;
        this.resetMenuToMain();
        this.overlay.classList.remove('hidden');
    }

    render() {
        this.renderer.clear();
        this.renderer.drawGrid();

        if (this.mode === 'boss') {
            this.boss.renderExtras(this.renderer);
        } else {
            this.renderer.drawWormWarnings(this.wormWarnings);
            this.renderer.drawPickup(this.pickup);
        }

        this.renderer.drawSnakes(this.snakes);
        this.renderer.drawPlayer(this.player);

        if (this.mode === 'boss') {
            this.renderer.drawBossBanner(this.bossCanvas, this.boss);
        }
    }

    startBossFight() {
        this.mode = 'boss';

        this.resetPlayerPosition();
        this.player.dx = 0;
        this.player.dy = 0;
        this.player.animFrame = 0;
        this.player.shielded = false;
        this.player.shieldUntil = 0;
        this.player.invisible = false;
        this.player.invisibleUntil = 0;
        this.player.sizeScale = 1;
        this.player.crowned = false;

        this.lives = this.startingLives;
        this.livesEl.textContent = String(this.lives);
        this.snakes = [];
        this.wormWarnings = [];
        this.pickup = null;

        this.boss = new BossFight(this);

        this.startTime = Date.now();
        this.pauseStartedAt = null;
        this.timeEl.textContent = '0:00';
        this.currentSpeedEl.textContent = this.formatSpeed(this.speedMultiplier);
        this.boss.updateHudText();
        this.bossHud.classList.remove('hidden');
        this.bossCanvas.classList.remove('hidden');
        this.renderer.sizeBossBanner(this.bossCanvas);

        this.overlay.classList.add('hidden');
        this.gameRunning = true;
        this.isPaused = false;
        this.fps = Math.round(BossFight.FPS_BASE * this.speedMultiplier);
        clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.gameLoop(), 1000 / this.fps);
    }

    bossVictory(elapsedOverride) {
        this.gameRunning = false;
        this.isPaused = false;
        clearInterval(this.gameInterval);

        const elapsed = elapsedOverride !== undefined ? elapsedOverride : Date.now() - this.startTime;
        let isNewRecord = false;
        if (!this.bossBestTime || elapsed < this.bossBestTime) {
            this.bossBestTime = elapsed;
            localStorage.setItem('rev_snake_boss_best_time', String(Math.round(elapsed)));
            isNewRecord = true;
        }

        this.bossHud.classList.add('hidden');
        this.bossCanvas.classList.add('hidden');

        this.overlayTitle.textContent = 'ПОБЕДА!';
        this.overlaySubtitle.innerHTML = [
            'Королева змей повержена!',
            `<br><br>Время: <span style="color:#66ccff;">${this.formatTime(elapsed)}</span>`,
            isNewRecord ? '<br><span style="color:#ffaa00;">Новый рекорд!</span>' : ''
        ].join('');
        this.resetMenuToMain();
        this.overlay.classList.remove('hidden');
    }

    bossDefeat(reason) {
        this.gameRunning = false;
        this.isPaused = false;
        clearInterval(this.gameInterval);

        this.bossHud.classList.add('hidden');
        this.bossCanvas.classList.add('hidden');

        const elapsed = this.formatTime(Date.now() - this.startTime);
        this.overlayTitle.textContent = 'ПОРАЖЕНИЕ';
        this.overlaySubtitle.innerHTML = `${reason}<br><br>Продержались: <span style="color:#ff4444;">${elapsed}</span>`;
        this.resetMenuToMain();
        this.overlay.classList.remove('hidden');
    }
}

new Game();
