class Renderer {
    constructor(canvas, tileCount) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize(tileCount);
    }

    resize(tileCount) {
        if (tileCount) this.tileCount = tileCount;
        const container = this.canvas.parentElement;
        const displaySize = Math.max(1, Math.round(container.clientWidth));
        const dpr = window.devicePixelRatio || 1;

        this.displaySize = displaySize;
        this.canvas.width = Math.round(displaySize * dpr);
        this.canvas.height = Math.round(displaySize * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.cellSize = displaySize / this.tileCount;
    }

    clear() {
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(0, 0, this.displaySize, this.displaySize);
    }

    drawGrid() {
        this.ctx.fillStyle = '#1a1a1a';
        for (let y = 0; y < this.tileCount; y++) {
            for (let x = 0; x < this.tileCount; x++) {
                if ((x + y) % 2 === 0) {
                    this.ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }
    }

    drawSnakes(snakes) {
        snakes.forEach(snake => {
            snake.body.forEach((part, index) => {
                if (part.x < 0 || part.x >= this.tileCount ||
                    part.y < 0 || part.y >= this.tileCount) return;

                const size = this.cellSize * snake.sizeFactor;
                const offset = (this.cellSize - size) / 2;
                const xPos = part.x * this.cellSize + offset;
                const yPos = part.y * this.cellSize + offset;

                this.ctx.fillStyle = snake.color;
                this.ctx.fillRect(xPos, yPos, size, size);

                this.ctx.fillStyle = snake.darkColor;
                this.ctx.fillRect(
                    xPos + size * 0.2,
                    yPos + size * 0.2,
                    size * 0.6,
                    size * 0.6
                );

                if (index === 0) {
                    this.ctx.fillStyle = '#000000';
                    const p = size / 4;
                    this.ctx.fillRect(xPos + p, yPos + p, p, p);
                    this.ctx.fillRect(xPos + p * 2.5, yPos + p, p, p);
                }
            });
        });
    }

    drawPlainApple(entity) {
        const px = entity.x * this.cellSize;
        const py = entity.y * this.cellSize;
        const p = this.cellSize / 8;

        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(px + p, py + p, p * 6, p * 5);

        this.ctx.fillStyle = '#664400';
        this.ctx.fillRect(px + p * 4, py, p, p);

        this.ctx.fillStyle = '#44cc44';
        this.ctx.fillRect(px + p * 5, py, p, p);
    }

    drawDrop(x, y) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;
        const p = this.cellSize / 8;

        this.ctx.fillStyle = '#66ff66';
        this.ctx.fillRect(px + p * 3.5, py + p, p, p * 2.5);
        this.ctx.fillRect(px + p * 3, py + p * 3, p * 2, p);
    }

    drawSplash(x, y) {
        const cx = x * this.cellSize + this.cellSize / 2;
        const cy = y * this.cellSize + this.cellSize / 2;
        const p = this.cellSize / 8;

        this.ctx.fillStyle = '#88ff88';
        this.ctx.fillRect(cx - p * 2, cy - p * 2, p * 4, p * 4);
        this.ctx.fillStyle = '#aaffaa';
        this.ctx.fillRect(cx - p * 4, cy - p * 0.5, p, p);
        this.ctx.fillRect(cx + p * 3, cy - p * 0.5, p, p);
        this.ctx.fillRect(cx - p * 0.5, cy - p * 4, p, p);
        this.ctx.fillRect(cx - p * 0.5, cy + p * 3, p, p);
    }

    drawIntroSnake(cx, cy, step, totalSteps, tileCount) {
        const startY = tileCount - 1;
        const targetY = cy + 2;
        const headY = Math.round(startY + (targetY - startY) * (step / totalSteps));

        const fakeSnake = {
            color: '#44cc44',
            darkColor: '#228822',
            sizeFactor: 0.9,
            body: []
        };
        for (let i = 0; i < 5; i++) {
            fakeSnake.body.push({ x: cx, y: headY + i });
        }
        this.drawSnakes([fakeSnake]);
    }

    drawPlayer(player) {
        const px = player.x * this.cellSize;
        const py = player.y * this.cellSize;
        const p = this.cellSize / 8;

        this.ctx.globalAlpha = player.invisible ? 0.4 : 1;

        const scale = player.sizeScale || 1;
        if (scale !== 1) {
            const cx = px + this.cellSize / 2;
            const cy = py + this.cellSize / 2;
            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-cx, -cy);
        }

        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(px + p * 0.75, py + p * 0.75, p * 6.5, p * 5.25);
        this.ctx.fillRect(px + p * 2, py, p * 4, p * 0.75);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(px + p * 2, py + p * 1.5, p * 1.25, p * 1.25);

        this.ctx.fillStyle = '#664400';
        this.ctx.fillRect(px + p * 3.9, py - p * 0.6, p, p);

        this.ctx.fillStyle = '#44cc44';
        this.ctx.fillRect(px + p * 5, py - p * 0.6, p * 1.25, p);

        this.ctx.fillStyle = '#aa2222';
        const legShift = p * 0.35;
        const legY = py + p * 6;
        if ((player.animFrame || 0) === 0) {
            this.ctx.fillRect(px + p * 2 - legShift, legY, p, p * 0.8);
            this.ctx.fillRect(px + p * 5 + legShift, legY, p, p * 1.4);
        } else {
            this.ctx.fillRect(px + p * 2 + legShift, legY, p, p * 1.4);
            this.ctx.fillRect(px + p * 5 - legShift, legY, p, p * 0.8);
        }

        if (player.crowned) {
            this.ctx.fillStyle = '#ffdd33';
            this.ctx.fillRect(px + p * 2, py - p * 1.5, p * 4, p);
            this.ctx.fillRect(px + p * 2, py - p * 2.2, p * 0.8, p * 0.9);
            this.ctx.fillRect(px + p * 3.6, py - p * 2.5, p * 0.8, p * 1.2);
            this.ctx.fillRect(px + p * 5.2, py - p * 2.2, p * 0.8, p * 0.9);
        }

        if (scale !== 1) {
            this.ctx.restore();
        }

        this.ctx.globalAlpha = 1;

        if (player.shielded) {
            this.ctx.strokeStyle = '#3399ff';
            this.ctx.lineWidth = Math.max(2, this.cellSize * 0.08);
            this.ctx.strokeRect(
                px + this.ctx.lineWidth / 2,
                py + this.ctx.lineWidth / 2,
                this.cellSize - this.ctx.lineWidth,
                this.cellSize - this.ctx.lineWidth
            );
        }
    }

    drawPickup(pickup) {
        if (!pickup) return;
        const px = pickup.x * this.cellSize;
        const py = pickup.y * this.cellSize;
        const p = this.cellSize / 8;

        if (pickup.type === 'life') {
            this.ctx.fillStyle = '#ff3333';
            this.ctx.fillRect(px + p * 2.75, py + p * 0.75, p * 2.5, p * 6.5);
            this.ctx.fillRect(px + p * 0.75, py + p * 2.75, p * 6.5, p * 2.5);
            return;
        }

        const color = pickup.type === 'shield' ? '#3399ff' : '#aa66ff';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px + p * 3.25, py + p * 0.5, p * 1.5, p * 3.5);
        this.ctx.fillRect(px + p * 2, py + p * 3.5, p * 4, p * 3);
    }

    drawWormWarnings(warnings) {
        if (!warnings || !warnings.length) return;
        warnings.forEach(w => {
            const px = w.x * this.cellSize;
            const py = w.y * this.cellSize;
            const blink = Math.floor(w.ticksLeft / 3) % 2 === 0;
            this.ctx.fillStyle = blink ? '#999999' : '#555555';
            this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
        });
    }

    drawStartScreen() {
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(0, 0, this.displaySize, this.displaySize);
    }

    drawToken(pos) {
        const px = pos.x * this.cellSize;
        const py = pos.y * this.cellSize;
        const p = this.cellSize / 8;

        this.ctx.fillStyle = '#ffcc00';
        this.ctx.fillRect(px + p * 3, py + p * 0.5, p * 2, p * 7);
        this.ctx.fillRect(px + p * 0.5, py + p * 3, p * 7, p * 2);
        this.ctx.fillStyle = '#aa7700';
        this.ctx.fillRect(px + p * 3.25, py + p * 3.25, p * 1.5, p * 1.5);
    }

    drawGrowApple(pos) {
        const px = pos.x * this.cellSize;
        const py = pos.y * this.cellSize;
        const p = this.cellSize / 8;

        this.ctx.fillStyle = '#ff88cc';
        this.ctx.fillRect(px + p * 1.5, py + p * 1.5, p * 5, p * 5);
        this.ctx.fillStyle = '#66cc66';
        this.ctx.fillRect(px + p * 3.5, py + p * 0.5, p, p);
    }

    drawSlamZone(cells, isWarning) {
        cells.forEach(c => {
            if (c.x < 0 || c.x >= this.tileCount || c.y < 0 || c.y >= this.tileCount) return;
            const px = c.x * this.cellSize;
            const py = c.y * this.cellSize;
            this.ctx.fillStyle = isWarning ? 'rgba(255, 140, 0, 0.35)' : 'rgba(255, 30, 30, 0.85)';
            this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
        });
    }

    drawCrown(pos) {
        const px = pos.x * this.cellSize;
        const py = pos.y * this.cellSize;
        const p = this.cellSize / 8;

        this.ctx.fillStyle = '#ffdd33';
        this.ctx.fillRect(px + p, py + p * 3.5, p * 6, p * 3);
        this.ctx.fillRect(px + p, py + p, p, p * 2.5);
        this.ctx.fillRect(px + p * 3.5, py, p, p * 3);
        this.ctx.fillRect(px + p * 6, py + p, p, p * 2.5);
    }

    drawRingMarkers(markers) {
        markers.forEach(m => {
            const px = m.x * this.cellSize;
            const py = m.y * this.cellSize;
            const p = this.cellSize / 8;
            if (m.visited) {
                this.ctx.fillStyle = '#44cc44';
                this.ctx.fillRect(px + p * 2, py + p * 2, p * 4, p * 4);
            } else {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = Math.max(1, p * 0.5);
                this.ctx.strokeRect(px + p * 1.5, py + p * 1.5, p * 5, p * 5);
            }
        });
    }

    sizeBossBanner(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.max(1, canvas.clientWidth);
        const displayHeight = Math.max(1, canvas.clientHeight);

        canvas.width = Math.round(displayWidth * dpr);
        canvas.height = Math.round(displayHeight * dpr);
        canvas._displayWidth = displayWidth;
        canvas._displayHeight = displayHeight;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    drawBossBanner(canvas, boss) {
        const ctx = canvas.getContext('2d');
        const w = canvas._displayWidth || canvas.clientWidth;
        const h = canvas._displayHeight || canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const unit = h / 6;

        ctx.fillStyle = '#2f8f2f';
        ctx.fillRect(0, 0, w, h * 0.75);
        ctx.fillStyle = '#256b25';
        ctx.fillRect(0, h * 0.75, w, h * 0.25);

        const faceX = w * (boss.faceX !== undefined ? boss.faceX : 0.5);
        ctx.fillStyle = '#000000';
        ctx.fillRect(faceX - unit * 1.6, h * 0.25, unit * 0.8, unit * 0.8);
        ctx.fillRect(faceX + unit * 0.8, h * 0.25, unit * 0.8, unit * 0.8);

        if (boss.phase < 3 || boss.crownFalling) {
            ctx.fillStyle = '#ffdd33';
            const cw = unit * 2.5;
            const cx0 = faceX - cw / 2;
            const cy0 = h * 0.08;
            ctx.fillRect(cx0, cy0 + unit * 0.5, cw, unit * 0.6);
            ctx.fillRect(cx0, cy0, unit * 0.4, unit);
            ctx.fillRect(cx0 + cw / 2 - unit * 0.2, cy0 - unit * 0.3, unit * 0.4, unit * 1.3);
            ctx.fillRect(cx0 + cw - unit * 0.4, cy0, unit * 0.4, unit);
        }
    }
}
