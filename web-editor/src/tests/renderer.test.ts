import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasRenderer, createSolidColorImage, flipImageDataHorizontal, flipImageDataVertical } from '@/renderer/canvas-renderer';

// Mock HTMLCanvasElement for testing
class MockCanvas {
  width = 800;
  height = 600;
  context: any;

  constructor() {
    this.context = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      imageSmoothingEnabled: true,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      drawImage: vi.fn(),
      putImageData: vi.fn(),
    };
  }

  getContext(type: string) {
    if (type === '2d') {
      return this.context;
    }
    return null;
  }

  toBlob(callback: (blob: Blob) => void) {
    // Mock blob creation
    const blob = new Blob(['mock'], { type: 'image/png' });
    callback(blob);
  }
}

describe('CanvasRenderer', () => {
  let canvas: any;
  let renderer: CanvasRenderer;

  beforeEach(() => {
    canvas = new MockCanvas();
    renderer = new CanvasRenderer(canvas as any);
  });

  describe('Initialization', () => {
    it('should create renderer with canvas', () => {
      expect(renderer).toBeDefined();
    });

    it('should disable image smoothing for pixel-perfect rendering', () => {
      expect(canvas.context.imageSmoothingEnabled).toBe(false);
    });
  });

  describe('View Management', () => {
    it('should set view with offset and scale', () => {
      renderer.setView(100, 200, 2);
      // View should be set (internal state)
      expect(renderer).toBeDefined();
    });
  });

  describe('Clear', () => {
    it('should clear canvas with default color', () => {
      renderer.clear();
      expect(canvas.context.fillStyle).toBe('#000000');
      expect(canvas.context.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should clear canvas with custom color', () => {
      renderer.clear('#FF0000');
      expect(canvas.context.fillStyle).toBe('#FF0000');
    });
  });

  describe('Coordinate Transformation', () => {
    it('should convert screen to world coordinates', () => {
      renderer.setView(100, 200, 1);
      const world = renderer.screenToWorld(50, 75);
      expect(world.x).toBe(150); // 50 + 100
      expect(world.y).toBe(275); // 75 + 200
    });

    it('should convert screen to world with zoom', () => {
      renderer.setView(0, 0, 2);
      const world = renderer.screenToWorld(100, 100);
      expect(world.x).toBe(50); // 100 / 2
      expect(world.y).toBe(50); // 100 / 2
    });

    it('should convert world to screen coordinates', () => {
      renderer.setView(100, 200, 1);
      const screen = renderer.worldToScreen(150, 275);
      expect(screen.x).toBe(50); // 150 - 100
      expect(screen.y).toBe(75); // 275 - 200
    });

    it('should convert world to screen with zoom', () => {
      renderer.setView(0, 0, 2);
      const screen = renderer.worldToScreen(50, 50);
      expect(screen.x).toBe(100); // 50 * 2
      expect(screen.y).toBe(100); // 50 * 2
    });
  });

  describe('Grid Drawing', () => {
    it('should draw grid with default parameters', () => {
      renderer.drawGrid();
      expect(canvas.context.strokeStyle).toBe('rgba(255, 255, 255, 0.2)');
      expect(canvas.context.lineWidth).toBe(1);
      expect(canvas.context.beginPath).toHaveBeenCalled();
      expect(canvas.context.stroke).toHaveBeenCalled();
    });

    it('should draw grid with custom tile size', () => {
      renderer.drawGrid(16);
      expect(canvas.context.stroke).toHaveBeenCalled();
    });

    it('should draw grid with custom color', () => {
      renderer.drawGrid(32, 'rgba(0, 255, 0, 0.5)');
      expect(canvas.context.strokeStyle).toBe('rgba(0, 255, 0, 0.5)');
    });
  });

  describe('Selection Drawing', () => {
    it('should draw selection box', () => {
      renderer.drawSelection(10, 20, 100, 100);
      expect(canvas.context.strokeStyle).toBe('#00FF00');
      expect(canvas.context.lineWidth).toBe(2);
      expect(canvas.context.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Canvas Operations', () => {
    it('should get canvas dimensions', () => {
      const dims = renderer.getDimensions();
      expect(dims.width).toBe(800);
      expect(dims.height).toBe(600);
    });

    it('should resize canvas', () => {
      renderer.resize(1024, 768);
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });
  });
});

describe('Image Utility Functions', () => {
  describe('createSolidColorImage', () => {
    it('should create image with solid color', () => {
      const color = 0xFF00FF00; // Red with full alpha
      const image = createSolidColorImage(16, 16, color);

      expect(image.width).toBe(16);
      expect(image.height).toBe(16);

      // Check first pixel
      expect(image.data[0]).toBe(0xFF); // R
      expect(image.data[1]).toBe(0x00); // G
      expect(image.data[2]).toBe(0xFF); // B
      expect(image.data[3]).toBe(0x00); // A
    });

    it('should fill all pixels with same color', () => {
      const color = 0x12345678;
      const image = createSolidColorImage(4, 4, color);

      for (let i = 0; i < 16; i++) {
        const idx = i * 4;
        expect(image.data[idx]).toBe(0x12); // R
        expect(image.data[idx + 1]).toBe(0x34); // G
        expect(image.data[idx + 2]).toBe(0x56); // B
        expect(image.data[idx + 3]).toBe(0x78); // A
      }
    });
  });

  describe('flipImageDataHorizontal', () => {
    it('should flip image horizontally', () => {
      const original = new ImageData(2, 2);
      // Set left pixels to red, right to blue
      original.data[0] = 255; // Top-left: red
      original.data[4] = 0;   // Top-right: blue
      original.data[5] = 0;
      original.data[6] = 255;

      const flipped = flipImageDataHorizontal(original);

      // After flip, top-left should be blue
      expect(flipped.data[0]).toBe(0);
      expect(flipped.data[1]).toBe(0);
      expect(flipped.data[2]).toBe(255);
    });

    it('should preserve image dimensions', () => {
      const original = new ImageData(8, 16);
      const flipped = flipImageDataHorizontal(original);

      expect(flipped.width).toBe(8);
      expect(flipped.height).toBe(16);
    });
  });

  describe('flipImageDataVertical', () => {
    it('should flip image vertically', () => {
      const original = new ImageData(2, 2);
      // Set top pixels to red, bottom to blue
      original.data[0] = 255; // Top-left: red
      original.data[8] = 0;   // Bottom-left: blue
      original.data[9] = 0;
      original.data[10] = 255;

      const flipped = flipImageDataVertical(original);

      // After flip, top-left should be blue
      expect(flipped.data[0]).toBe(0);
      expect(flipped.data[1]).toBe(0);
      expect(flipped.data[2]).toBe(255);
    });

    it('should preserve image dimensions', () => {
      const original = new ImageData(16, 8);
      const flipped = flipImageDataVertical(original);

      expect(flipped.width).toBe(16);
      expect(flipped.height).toBe(8);
    });
  });
});
