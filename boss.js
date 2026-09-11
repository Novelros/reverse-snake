class BossFight {
    static FPS_BASE = 12;

    static TOKENS_NEEDED = 3;
    static TOKEN_SPAWN_DELAY = 40;
    static TOKEN_SPAWN_INTERVAL = 120;

    static APPLES_NEEDED = 3;
    static APPLE_SPAWN_DELAY = 40;
    static APPLE_SPAWN_INTERVAL = 130;
    static APPLE_GROWTH_STEP = 0.15;

    static PHASE_SNAKE_CONFIG = {
        1: { maxSnakes: 4, spawnInterval: 14 },
        2: { maxSnakes: 6, spawnInterval: 9 },
        3: { maxSnakes: 8, spawnInterval: 5 }
    };
    static PHASE3_RUSH_MIN_FACTOR = 0.5;

    static SLAM_WARMUP_DELAY = 70;
    static SLAM_INTERVAL = 90;
    static SLAM_WARNING_TICKS = 20;
    static SLAM_ACTIVE_TICKS = 4;
    static SLAM_MIN_SIZE = 5;
    static SLAM_SIZE_RANGE = 4;

    static CROWN_Y = 4;
    static CROWN_DROP_TICKS = 10;
    static RING_RADIUS = 2;

    static OUTRO_FLEE_FRAMES = 10;
    static OUTRO_FRAME_DELAY_MS = 90;
    static OUTRO_FINAL_DELAY_MS = 400;

    constructor(game) {
        this.game = game;

        this.phase = 1;
        this.faceX = 0.5;
        this.outroPlaying = false;

        this.tokensCollected = 0;
        this.tokenPickup = null;
        this.tokenTimer = BossFight.TOKEN_SPAWN_DELAY;

        this.applesCollected = 0;
        this.applePickup = null;
        this.appleTimer = BossFight.APPLE_SPAWN_DELAY;

        const phase1 = BossFight.PHASE_SNAKE_CONFIG[1];
        this.snakeSpawnTimer = 0;
        this.snakeSpawnInterval = phase1.spawnInterval;
        this.maxSnakes = phase1.maxSnakes;

        this.slamWarning = null;
        this.slamActive = null;
        this.slamTimer = BossFight.SLAM_WARMUP_DELAY;

        this.crownPos = null;
        this.crownFalling = false;
        this.crownDropProgress = 0;
        this.ringMarkers = [];
    }

    update() {
        const game = this.game;

        this.faceX += (game.player.x / game.tileCount - this.faceX) * 0.05;

        this.updateSnakeSpawns();

        if (this.phase === 1) {
            this.updateTokens();
            if (this.tokensCollected >= BossFight.TOKENS_NEEDED) {
                this.startPhase2();
            }
        } else if (this.phase === 2) {
            this.updateSlam();
            if (game.gameRunning) this.updateApples();
            if (game.gameRunning && this.applesCollected >= BossFight.APPLES_NEEDED) {
                this.startPhase3();
            }
        } else if (this.phase === 3) {
            this.updateCrownDrop();
            this.updateRing();
        }

        if (game.gameRunning) this.updateHudText();
    }

    currentSpawnInterval() {
        if (this.phase !== 3 || this.crownFalling || this.ringMarkers.length === 0) {
            return this.snakeSpawnInterval;
        }
        const visited = this.ringMarkers.filter(m => m.visited).length;
        const progress = visited / this.ringMarkers.length;
        const factor = 1 - progress * (1 - BossFight.PHASE3_RUSH_MIN_FACTOR);
        return Math.round(this.snakeSpawnInterval * factor);
    }

    updateSnakeSpawns() {
        const game = this.game;
        const currentGreens = game.snakes.filter(s => s.type === 'green').length;
        this.snakeSpawnTimer++;
        if (this.snakeSpawnTimer >= this.currentSpawnInterval() && currentGreens < this.maxSnakes) {
            this.snakeSpawnTimer = 0;
            game.spawnSnake('green');
        }
    }

    findSafeCell() {
        const game = this.game;
        for (let attempt = 0; attempt < 20; attempt++) {
            const x = Math.floor(Math.random() * game.tileCount);
            const y = Math.floor(Math.random() * game.tileCount);
            const onPlayer = game.player.x === x && game.player.y === y;
            const onSnake = game.snakes.some(s => s.body.some(p => p.x === x && p.y === y));
            if (!onPlayer && !onSnake) return { x, y };
        }
        return null;
    }

    updateTokens() {
        const game = this.game;
        if (!this.tokenPickup) {
            this.tokenTimer++;
            if (this.tokenTimer >= BossFight.TOKEN_SPAWN_INTERVAL) {
                this.tokenTimer = 0;
                this.tokenPickup = this.findSafeCell();
            }
            return;
        }
        if (game.player.x === this.tokenPickup.x && game.player.y === this.tokenPickup.y) {
            this.tokenPickup = null;
            this.tokensCollected++;
        }
    }

    startPhase2() {
        this.phase = 2;
        this.tokenPickup = null;
        this.game.snakes = [];

        const cfg = BossFight.PHASE_SNAKE_CONFIG[2];
        this.snakeSpawnInterval = cfg.spawnInterval;
        this.maxSnakes = cfg.maxSnakes;
        this.slamTimer = BossFight.SLAM_WARMUP_DELAY;
    }

    generateSlamZone() {
        const tileCount = this.game.tileCount;
        const size = BossFight.SLAM_MIN_SIZE + Math.floor(Math.random() * BossFight.SLAM_SIZE_RANGE);
        const maxStart = Math.max(0, tileCount - size);
        const startX = Math.floor(Math.random() * (maxStart + 1));
        const startY = Math.floor(Math.random() * (maxStart + 1));
        const cells = [];
        for (let x = startX; x < startX + size; x++) {
            for (let y = startY; y < startY + size; y++) {
                cells.push({ x, y });
            }
        }
        return cells;
    }

    updateSlam() {
        const game = this.game;

        if (this.slamActive) {
            this.slamActive.ticksLeft--;
            const hit = this.slamActive.cells.some(c => c.x === game.player.x && c.y === game.player.y);
            if (hit && !game.player.shielded) {
                game.loseLife('Вас накрыла атака королевы');
            }
            if (this.slamActive.ticksLeft <= 0) this.slamActive = null;
            return;
        }

        if (this.slamWarning) {
            this.slamWarning.ticksLeft--;
            if (this.slamWarning.ticksLeft <= 0) {
                this.slamActive = { cells: this.slamWarning.cells, ticksLeft: BossFight.SLAM_ACTIVE_TICKS };
                this.slamWarning = null;
            }
            return;
        }

        this.slamTimer++;
        if (this.slamTimer >= BossFight.SLAM_INTERVAL) {
            this.slamTimer = 0;
            this.slamWarning = { cells: this.generateSlamZone(), ticksLeft: BossFight.SLAM_WARNING_TICKS };
        }
    }

    updateApples() {
        const game = this.game;
        if (!this.applePickup) {
            this.appleTimer++;
            if (this.appleTimer >= BossFight.APPLE_SPAWN_INTERVAL) {
                this.appleTimer = 0;
                this.applePickup = this.findSafeCell();
            }
            return;
        }
        if (game.player.x === this.applePickup.x && game.player.y === this.applePickup.y) {
            this.applePickup = null;
            this.applesCollected++;
            game.player.sizeScale = 1 + this.applesCollected * BossFight.APPLE_GROWTH_STEP;
        }
    }

    startPhase3() {
        const game = this.game;
        this.phase = 3;
        this.applePickup = null;
        this.slamWarning = null;
        this.slamActive = null;
        game.snakes = [];

        const cfg = BossFight.PHASE_SNAKE_CONFIG[3];
        this.snakeSpawnInterval = cfg.spawnInterval;
        this.maxSnakes = cfg.maxSnakes;

        const cx = Math.floor(game.tileCount / 2);
        const cy = Math.min(BossFight.CROWN_Y, game.tileCount - 1);
        this.crownPos = { x: cx, y: cy };
        this.crownFalling = true;
        this.crownDropProgress = 0;

        const r = BossFight.RING_RADIUS;
        const offsets = [
            { x: -r, y: 0 }, { x: r, y: 0 }, { x: 0, y: -r }, { x: 0, y: r },
            { x: -r, y: -r }, { x: -r, y: r }, { x: r, y: -r }, { x: r, y: r }
        ];
        this.ringMarkers = offsets
            .map(o => ({ x: cx + o.x, y: cy + o.y, visited: false }))
            .filter(m => m.x >= 0 && m.x < game.tileCount && m.y >= 0 && m.y < game.tileCount);
    }

    updateCrownDrop() {
        if (!this.crownFalling) return;
        this.crownDropProgress++;
        if (this.crownDropProgress >= BossFight.CROWN_DROP_TICKS) {
            this.crownFalling = false;
        }
    }

    updateRing() {
        const game = this.game;
        if (this.crownFalling || this.outroPlaying) return;

        this.ringMarkers.forEach(marker => {
            if (!marker.visited && game.player.x === marker.x && game.player.y === marker.y) {
                marker.visited = true;
            }
        });

        if (this.ringMarkers.every(m => m.visited)) {
            this.outroPlaying = true;
            this.playOutro(Date.now() - game.startTime);
        }
    }

    updateHudText() {
        const game = this.game;
        if (this.phase === 1) {
            game.bossPhaseEl.textContent = `Фаза 1: Соберите жетоны (${this.tokensCollected}/${BossFight.TOKENS_NEEDED})`;
        } else if (this.phase === 2) {
            game.bossPhaseEl.textContent = `Фаза 2: Уворачивайтесь от ударов и соберите яблоки (${this.applesCollected}/${BossFight.APPLES_NEEDED})`;
        } else if (this.crownFalling) {
            game.bossPhaseEl.textContent = 'Фаза 3: Корона падает...';
        } else {
            const visited = this.ringMarkers.filter(m => m.visited).length;
            game.bossPhaseEl.textContent = `Фаза 3: Окружите королеву (${visited}/${this.ringMarkers.length})`;
        }
    }

    playOutro(elapsedAtVictory) {
        const game = this.game;
        clearInterval(game.gameInterval);
        game.player.dx = 0;
        game.player.dy = 0;
        game.player.crowned = true;
        game.bossPhaseEl.textContent = 'Королева повержена! Змеи разбегаются...';

        game.snakes.forEach(snake => {
            const head = snake.body[0];
            const awayX = head.x - game.player.x;
            const awayY = head.y - game.player.y;
            if (Math.abs(awayX) >= Math.abs(awayY)) {
                snake.dx = awayX >= 0 ? 1 : -1;
                snake.dy = 0;
            } else {
                snake.dy = awayY >= 0 ? 1 : -1;
                snake.dx = 0;
            }
        });

        let frame = 0;
        const step = () => {
            frame++;
            game.snakes.forEach(snake => {
                const head = snake.body[0];
                const newHead = { x: head.x + snake.dx, y: head.y + snake.dy };
                snake.body.unshift(newHead);
                snake.body.pop();
            });
            game.snakes = game.snakes.filter(s => !s.isOutOfBounds(game.tileCount));
            game.render();

            if (frame < BossFight.OUTRO_FLEE_FRAMES && game.snakes.length > 0) {
                setTimeout(step, BossFight.OUTRO_FRAME_DELAY_MS);
            } else {
                game.snakes = [];
                game.render();
                setTimeout(() => game.bossVictory(elapsedAtVictory), BossFight.OUTRO_FINAL_DELAY_MS);
            }
        };
        setTimeout(step, BossFight.OUTRO_FRAME_DELAY_MS);
    }

    renderExtras(renderer) {
        if (this.phase === 1 && this.tokenPickup) {
            renderer.drawToken(this.tokenPickup);
        } else if (this.phase === 2) {
            if (this.slamWarning) renderer.drawSlamZone(this.slamWarning.cells, true);
            if (this.slamActive) renderer.drawSlamZone(this.slamActive.cells, false);
            if (this.applePickup) renderer.drawGrowApple(this.applePickup);
        } else if (this.phase === 3) {
            if (!this.crownFalling && this.crownPos) renderer.drawCrown(this.crownPos);
            renderer.drawRingMarkers(this.ringMarkers);
        }
    }
}
