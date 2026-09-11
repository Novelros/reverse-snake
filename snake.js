class Snake {
    constructor(type, gridSize, spawnOverride) {
        this.type = type;
        this.timer = 0;
        this.state = 'normal';
        this.moveTicket = 0;

        if (type === 'yellow') {
            this.sizeFactor = 0.5;
            this.color = '#ffdd44';
            this.darkColor = '#ccaa00';
            this.speedDivider = 1;
        } else if (type === 'red') {
            this.sizeFactor = 1.3;
            this.color = '#ff4444';
            this.darkColor = '#aa2222';
            this.speedDivider = 1.5;
        } else if (type === 'worm') {
            this.sizeFactor = 0.55;
            this.color = '#c9a66b';
            this.darkColor = '#8a6a3f';
            this.speedDivider = 1;
            this.emerging = true;
            this.maxLength = 8;
        } else {
            this.sizeFactor = 0.9;
            this.color = '#44cc44';
            this.darkColor = '#228822';
            this.speedDivider = 1;
        }

        this.body = this.createBody(gridSize, spawnOverride);
    }

    getRandomEdgePosition(gridSize) {
        const TILE_COUNT = gridSize;
        const edge = Math.floor(Math.random() * 4);
        let x, y, dx, dy;

        if (edge === 0) {
            x = Math.floor(Math.random() * (TILE_COUNT - 4)) + 2;
            y = 0;
            dx = 0;
            dy = 1;
        } else if (edge === 1) {
            x = TILE_COUNT - 1;
            y = Math.floor(Math.random() * (TILE_COUNT - 4)) + 2;
            dx = -1;
            dy = 0;
        } else if (edge === 2) {
            x = Math.floor(Math.random() * (TILE_COUNT - 4)) + 2;
            y = TILE_COUNT - 1;
            dx = 0;
            dy = -1;
        } else {
            x = 0;
            y = Math.floor(Math.random() * (TILE_COUNT - 4)) + 2;
            dx = 1;
            dy = 0;
        }

        return { x, y, dx, dy };
    }

    createBody(gridSize, spawnOverride) {
        const start = spawnOverride || this.getRandomEdgePosition(gridSize);
        this.dx = start.dx;
        this.dy = start.dy;

        if (this.type === 'worm') {
            return [{ x: start.x, y: start.y }];
        }

        const length = this.type === 'red' ? 5 : 6;
        const body = [];

        for (let i = 0; i < length; i++) {
            body.push({
                x: start.x - start.dx * i,
                y: start.y - start.dy * i
            });
        }

        return body;
    }

    update(player, gridSize, obstacles) {
        this.moveTicket += 1;
        if (this.moveTicket < this.speedDivider) return;
        this.moveTicket = 0;

        const head = this.body[0];
        this.timer++;

        if (this.type === 'yellow' && this.state === 'normal' && this.timer === 10 && !player.invisible) {
            this.state = 'turned';
            if (this.dx !== 0) {
                this.dx = 0;
                this.dy = player.y > head.y ? 1 : -1;
            } else {
                this.dy = 0;
                this.dx = player.x > head.x ? 1 : -1;
            }
        } else if (this.type === 'red' && this.state === 'normal') {
            if (this.timer < 30) {
                if (!player.invisible) {
                    if (Math.abs(player.x - head.x) > Math.abs(player.y - head.y)) {
                        this.dx = player.x > head.x ? 1 : -1;
                        this.dy = 0;
                    } else {
                        this.dy = player.y > head.y ? 1 : -1;
                        this.dx = 0;
                    }
                }
            } else {
                this.state = 'retreat';
                const dists = [head.x, gridSize - head.x, head.y, gridSize - head.y];
                const min = Math.min(...dists);
                if (min === head.x) { this.dx = -1; this.dy = 0; }
                else if (min === gridSize - head.x) { this.dx = 1; this.dy = 0; }
                else if (min === head.y) { this.dx = 0; this.dy = -1; }
                else { this.dx = 0; this.dy = 1; }
            }
        }

        if (this.type !== 'green' && obstacles && obstacles.length) {
            const nextX = head.x + this.dx;
            const nextY = head.y + this.dy;
            const blocked = obstacles.some(o => o.x === nextX && o.y === nextY);

            if (blocked) {
                const perpOptions = this.dx !== 0
                    ? [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }]
                    : [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

                const free = perpOptions.find(o =>
                    !obstacles.some(ob => ob.x === head.x + o.dx && ob.y === head.y + o.dy)
                );

                if (free) {
                    this.dx = free.dx;
                    this.dy = free.dy;
                }
            }
        }

        const newHead = { x: head.x + this.dx, y: head.y + this.dy };
        this.body.unshift(newHead);

        if (this.emerging) {
            if (this.body.length >= this.maxLength) {
                this.emerging = false;
            }
        } else {
            this.body.pop();
        }
    }

    isOutOfBounds(gridSize) {
        return this.body.every(part =>
            part.x < -1 || part.x > gridSize ||
            part.y < -1 || part.y > gridSize
        );
    }
}
