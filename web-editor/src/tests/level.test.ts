import { describe, it, expect, beforeEach } from 'vitest';
import { CartFile } from '@/core/rom-file';
import { decodeSnesTile, create32x32Tile } from '@/core/level';
import { Palette } from '@/types';

describe('Level Data Functions', () => {
  describe('SNES Tile Decoding', () => {
    it('should decode 2bpp SNES tile correctly', () => {
      // Create a simple 8x8 tile with test pattern
      const tileData = new Uint8Array(32);

      // First row: all pixels are color 0
      tileData[0] = 0b00000000; // Plane 0, row 0
      tileData[16] = 0b00000000; // Plane 1, row 0

      // Second row: all pixels are color 1 (plane 0 = 1, plane 1 = 0)
      tileData[2] = 0b11111111; // Plane 0, row 1
      tileData[18] = 0b00000000; // Plane 1, row 1

      // Third row: all pixels are color 2 (plane 0 = 0, plane 1 = 1)
      tileData[4] = 0b00000000; // Plane 0, row 2
      tileData[20] = 0b11111111; // Plane 1, row 2

      // Fourth row: all pixels are color 3 (both planes = 1)
      tileData[6] = 0b11111111; // Plane 0, row 3
      tileData[22] = 0b11111111; // Plane 1, row 3

      const palette: Palette = {
        colors: [
          0xFF0000FF, // Color 0: Red
          0x00FF00FF, // Color 1: Green
          0x0000FFFF, // Color 2: Blue
          0xFFFF00FF, // Color 3: Yellow
        ],
      };

      const imageData = decodeSnesTile(tileData, 0, palette);

      expect(imageData.width).toBe(8);
      expect(imageData.height).toBe(8);

      // Check first row (should be red)
      for (let x = 0; x < 8; x++) {
        const idx = x * 4;
        expect(imageData.data[idx]).toBe(0xFF); // R
        expect(imageData.data[idx + 1]).toBe(0x00); // G
        expect(imageData.data[idx + 2]).toBe(0x00); // B
        expect(imageData.data[idx + 3]).toBe(0xFF); // A
      }

      // Check second row (should be green)
      for (let x = 0; x < 8; x++) {
        const idx = (8 + x) * 4;
        expect(imageData.data[idx]).toBe(0x00); // R
        expect(imageData.data[idx + 1]).toBe(0xFF); // G
        expect(imageData.data[idx + 2]).toBe(0x00); // B
        expect(imageData.data[idx + 3]).toBe(0xFF); // A
      }
    });

    it('should handle multiple tiles', () => {
      const tileData = new Uint8Array(64); // 2 tiles
      const palette: Palette = {
        colors: [0xFF0000FF, 0x00FF00FF, 0x0000FFFF, 0xFFFF00FF],
      };

      // Decode first tile
      const tile0 = decodeSnesTile(tileData, 0, palette);
      expect(tile0.width).toBe(8);
      expect(tile0.height).toBe(8);

      // Decode second tile
      const tile1 = decodeSnesTile(tileData, 1, palette);
      expect(tile1.width).toBe(8);
      expect(tile1.height).toBe(8);
    });
  });

  describe('32x32 Tile Creation', () => {
    it('should create 32x32 tile from 8x8 tiles', () => {
      // Create 16 simple 8x8 tiles (4x4 grid)
      const tiles: ImageData[] = [];
      for (let i = 0; i < 16; i++) {
        const tile = new ImageData(8, 8);
        // Fill with a color based on index
        const color = [
          (i * 16) % 256,
          ((i * 16) + 64) % 256,
          ((i * 16) + 128) % 256,
          255,
        ];
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const idx = (y * 8 + x) * 4;
            tile.data[idx] = color[0];
            tile.data[idx + 1] = color[1];
            tile.data[idx + 2] = color[2];
            tile.data[idx + 3] = color[3];
          }
        }
        tiles.push(tile);
      }

      const tile32 = create32x32Tile(tiles);

      expect(tile32.width).toBe(32);
      expect(tile32.height).toBe(32);

      // Verify first 8x8 section matches first tile
      const firstTileColor = [0, 64, 128, 255];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = (y * 32 + x) * 4;
          expect(tile32.data[idx]).toBe(firstTileColor[0]);
          expect(tile32.data[idx + 1]).toBe(firstTileColor[1]);
          expect(tile32.data[idx + 2]).toBe(firstTileColor[2]);
          expect(tile32.data[idx + 3]).toBe(firstTileColor[3]);
        }
      }
    });

    it('should handle horizontal flip', () => {
      const tiles: ImageData[] = [];
      for (let i = 0; i < 16; i++) {
        tiles.push(new ImageData(8, 8));
      }

      const tile32 = create32x32Tile(tiles, true, false);

      expect(tile32.width).toBe(32);
      expect(tile32.height).toBe(32);
    });

    it('should handle vertical flip', () => {
      const tiles: ImageData[] = [];
      for (let i = 0; i < 16; i++) {
        tiles.push(new ImageData(8, 8));
      }

      const tile32 = create32x32Tile(tiles, false, true);

      expect(tile32.width).toBe(32);
      expect(tile32.height).toBe(32);
    });

    it('should handle both flips', () => {
      const tiles: ImageData[] = [];
      for (let i = 0; i < 16; i++) {
        tiles.push(new ImageData(8, 8));
      }

      const tile32 = create32x32Tile(tiles, true, true);

      expect(tile32.width).toBe(32);
      expect(tile32.height).toBe(32);
    });
  });

  describe('Palette Handling', () => {
    it('should convert SNES 15-bit color to RGBA', () => {
      // SNES color format: 0bbbbbgggggrrrrr
      // Example: Pure red = 0x001F
      const snesRed = 0x001F;
      const r = (snesRed & 0x1F) << 3;
      const g = ((snesRed >> 5) & 0x1F) << 3;
      const b = ((snesRed >> 10) & 0x1F) << 3;

      expect(r).toBe(0xF8); // ~248
      expect(g).toBe(0x00);
      expect(b).toBe(0x00);
    });

    it('should handle full palette range', () => {
      // White in SNES: all bits set = 0x7FFF
      const snesWhite = 0x7FFF;
      const r = (snesWhite & 0x1F) << 3;
      const g = ((snesWhite >> 5) & 0x1F) << 3;
      const b = ((snesWhite >> 10) & 0x1F) << 3;

      expect(r).toBe(0xF8);
      expect(g).toBe(0xF8);
      expect(b).toBe(0xF8);
    });
  });
});
