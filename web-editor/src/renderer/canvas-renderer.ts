/**
 * HTML5 Canvas Renderer for DKC2 Levels
 * Replaces GDI rendering from C++ with Canvas API
 */

import { TileMap, LevelSprite, Palette } from '@/types';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering
  }

  /**
   * Set camera position and zoom
   */
  setView(offsetX: number, offsetY: number, scale: number = 1): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.scale = scale;
  }

  /**
   * Clear the canvas
   */
  clear(color: string = '#000000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw a tile at screen position
   */
  drawTile(
    tileImage: ImageData,
    screenX: number,
    screenY: number,
    width: number = 32,
    height: number = 32
  ): void {
    // Create temporary canvas for the tile
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tileImage.width;
    tempCanvas.height = tileImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(tileImage, 0, 0);

    // Apply camera transform
    const x = (screenX - this.offsetX) * this.scale;
    const y = (screenY - this.offsetY) * this.scale;
    const w = width * this.scale;
    const h = height * this.scale;

    // Draw to main canvas
    this.ctx.drawImage(tempCanvas, x, y, w, h);
  }

  /**
   * Draw entire tilemap
   */
  drawTilemap(
    tilemap: TileMap,
    tileImages: Map<number, ImageData>
  ): void {
    const tileSize = 32; // DKC2 uses 32x32 tiles

    for (let y = 0; y < tilemap.mapHeight; y++) {
      for (let x = 0; x < tilemap.mapWidth; x++) {
        const tileIndex = y * tilemap.mapWidth + x;
        const tile = tilemap.tiles.get(tileIndex);

        if (!tile) continue;

        const tileImage = tileImages.get(tile.partId);
        if (!tileImage) continue;

        const screenX = x * tileSize;
        const screenY = y * tileSize;

        this.drawTile(tileImage, screenX, screenY, tileSize, tileSize);
      }
    }
  }

  /**
   * Draw a sprite at position
   */
  drawSprite(
    sprite: LevelSprite,
    spriteImage: ImageData,
    width: number = 16,
    height: number = 16
  ): void {
    // Apply camera transform
    const x = (sprite.x - this.offsetX) * this.scale;
    const y = (sprite.y - this.offsetY) * this.scale;
    const w = width * this.scale;
    const h = height * this.scale;

    // Create temporary canvas for the sprite
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = spriteImage.width;
    tempCanvas.height = spriteImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(spriteImage, 0, 0);

    // Draw to main canvas
    this.ctx.drawImage(tempCanvas, x, y, w, h);
  }

  /**
   * Draw sprites layer
   */
  drawSprites(
    sprites: LevelSprite[],
    spriteImages: Map<number, ImageData>
  ): void {
    for (const sprite of sprites) {
      if (!sprite.valid) continue;

      const spriteImage = spriteImages.get(sprite.propId);
      if (!spriteImage) continue;

      this.drawSprite(sprite, spriteImage);
    }
  }

  /**
   * Draw grid overlay for editing
   */
  drawGrid(tileSize: number = 32, color: string = 'rgba(255, 255, 255, 0.2)'): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    const startX = Math.floor(this.offsetX / tileSize) * tileSize;
    const startY = Math.floor(this.offsetY / tileSize) * tileSize;
    const endX = this.offsetX + this.canvas.width / this.scale;
    const endY = this.offsetY + this.canvas.height / this.scale;

    // Vertical lines
    for (let x = startX; x < endX; x += tileSize) {
      const screenX = (x - this.offsetX) * this.scale;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y < endY; y += tileSize) {
      const screenY = (y - this.offsetY) * this.scale;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }

  /**
   * Draw selection box
   */
  drawSelection(x: number, y: number, width: number, height: number): void {
    const screenX = (x - this.offsetX) * this.scale;
    const screenY = (y - this.offsetY) * this.scale;
    const w = width * this.scale;
    const h = height * this.scale;

    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(screenX, screenY, w, h);
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.scale + this.offsetX,
      y: screenY / this.scale + this.offsetY,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.offsetX) * this.scale,
      y: (worldY - this.offsetY) * this.scale,
    };
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Save canvas as image
   */
  saveAsImage(filename: string = 'level.png'): void {
    this.canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

/**
 * Create ImageData from palette color
 */
export function createSolidColorImage(
  width: number,
  height: number,
  color: number
): ImageData {
  const imageData = new ImageData(width, height);
  const pixels = imageData.data;

  const r = (color >> 24) & 0xFF;
  const g = (color >> 16) & 0xFF;
  const b = (color >> 8) & 0xFF;
  const a = color & 0xFF;

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }

  return imageData;
}

/**
 * Flip ImageData horizontally
 */
export function flipImageDataHorizontal(imageData: ImageData): ImageData {
  const flipped = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = flipped.data;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIndex = (y * imageData.width + x) * 4;
      const dstIndex = (y * imageData.width + (imageData.width - 1 - x)) * 4;

      dst[dstIndex] = src[srcIndex];
      dst[dstIndex + 1] = src[srcIndex + 1];
      dst[dstIndex + 2] = src[srcIndex + 2];
      dst[dstIndex + 3] = src[srcIndex + 3];
    }
  }

  return flipped;
}

/**
 * Flip ImageData vertically
 */
export function flipImageDataVertical(imageData: ImageData): ImageData {
  const flipped = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = flipped.data;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIndex = (y * imageData.width + x) * 4;
      const dstIndex = ((imageData.height - 1 - y) * imageData.width + x) * 4;

      dst[dstIndex] = src[srcIndex];
      dst[dstIndex + 1] = src[srcIndex + 1];
      dst[dstIndex + 2] = src[srcIndex + 2];
      dst[dstIndex + 3] = src[srcIndex + 3];
    }
  }

  return flipped;
}
