class Renderer {
    constructor(canvas, gridSize) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = gridSize;
        this.tileCount = gridSize;
        this.canvas.width = gridSize * gridSize;
        this.canvas.height = gridSize * gridSize;
    }
    
    clear() {
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        this.ctx.fillStyle = '#1a1a1a';
        for (let y = 0; y < this.tileCount; y++) {
            for (let x = 0; x < this.tileCount; x++) {
                if ((x + y) % 2 === 0) {
                    this.ctx.fillRect(
                        x * this.gridSize, 
                        y * this.gridSize, 
                        this.gridSize, 
                        this.gridSize
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

                const size = this.gridSize * snake.sizeFactor;
                const offset = (this.gridSize - size) / 2;
                const xPos = part.x * this.gridSize + offset;
                const yPos = part.y * this.gridSize + offset;

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
    
    drawPlayer(player) {
        const px = player.x * this.gridSize;
        const py = player.y * this.gridSize;
        const p = this.gridSize / 8;

        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(px + p, py + p * 2, p * 6, p * 5);
        this.ctx.fillRect(px + p * 2, py + p, p * 4, p);
        this.ctx.fillRect(px + p * 2, py + p * 7, p * 4, p);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(px + p * 2, py + p * 2, p, p);

        this.ctx.fillStyle = '#664400';
        this.ctx.fillRect(px + p * 4, py, p, p);
        
        this.ctx.fillStyle = '#44cc44';
        this.ctx.fillRect(px + p * 5, py, p, p);
    }
    
    drawStartScreen() {
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}