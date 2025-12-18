import { describe, it, expect } from 'vitest';
import { rareDecompress } from '@/core/decompress';
import { RomBuffer } from '@/core/rom-file';

describe('Rare LZ77 Decompression', () => {
  describe('Basic decompression', () => {
    it('should handle empty/terminator case (0x00 with times=0)', () => {
      // Create compressed data that terminates immediately
      const compressedData = new Uint8Array([
        0x00, // Header byte (skip)
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, // Common bytes (6 bytes)
        // 32 bytes of skip data
        ...new Array(32).fill(0),
        0x00, // d = 0x00, t = 0x00, times = 0 -> terminate
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result!.length).toBe(0); // Empty decompression
    });

    it('should handle 0x3F terminator case', () => {
      // Create compressed data with 0x3F terminator
      const compressedData = new Uint8Array([
        0x00, // Header byte
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, // Common bytes
        ...new Array(32).fill(0), // Skip 32 bytes
        0xFC, // d = 0xFC, t = (0xF0 >> 2) = 0x3C... after calculation: 0x3F
        0x00, // Next byte: times = 0 -> terminate
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should handle simple byte copy (0x00 case)', () => {
      const compressedData = new Uint8Array([
        0x00, // Header
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, // Common bytes
        ...new Array(32).fill(0), // Skip
        0x03, // d = 0x03, t = 0x00, times = 3 -> copy 3 bytes
        0xAA, 0xBB, 0xCC, // 3 bytes to copy
        0x00, // Terminate
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(3);
      expect(Array.from(result!)).toEqual([0xAA, 0xBB, 0xCC]);
    });

    it('should handle fill with common[0] (0x10 case)', () => {
      const compressedData = new Uint8Array([
        0x00, // Header
        0xFF, 0x02, 0x03, 0x04, 0x05, 0x06, // Common bytes (common[0] = 0xFF)
        ...new Array(32).fill(0), // Skip
        0x45, // d = 0x45, t = (0x40 >> 2) = 0x10, times = (0x05 + 3) = 8
        0x00, // Terminate
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(8);
      expect(Array.from(result!)).toEqual([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    });

    it('should handle fill with common[1] (0x14 case)', () => {
      const compressedData = new Uint8Array([
        0x00, // Header
        0x01, 0xEE, 0x03, 0x04, 0x05, 0x06, // Common bytes (common[1] = 0xEE)
        ...new Array(32).fill(0), // Skip
        0x52, // d = 0x52, t = (0x50 >> 2) = 0x14, times = (0x02 + 3) = 5
        0x00, // Terminate
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(5);
      expect(Array.from(result!)).toEqual([0xEE, 0xEE, 0xEE, 0xEE, 0xEE]);
    });

    it('should handle fill with provided byte (0x0C case)', () => {
      const compressedData = new Uint8Array([
        0x00, // Header
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, // Common bytes
        ...new Array(32).fill(0), // Skip
        0x34, // d = 0x34, t = (0x30 >> 2) = 0x0C, times = (0x04 + 3) = 7
        0x77, // Byte to fill with
        0x00, // Terminate
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(7);
      expect(Array.from(result!)).toEqual([0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77]);
    });
  });

  describe('Edge cases', () => {
    it('should return null on invalid data', () => {
      // Too short buffer
      const compressedData = new Uint8Array([0x00, 0x01]);
      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).toBeNull();
    });

    it('should handle unknown decompression type', () => {
      const compressedData = new Uint8Array([
        0x00, // Header
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, // Common bytes
        ...new Array(32).fill(0), // Skip
        0xFF, // d = 0xFF, t = (0xF0 >> 2) = 0x3C -> after calc could be unknown
        0x00,
      ]);

      const buffer = new RomBuffer(compressedData);
      rareDecompress(buffer);

      // Should either handle it or return null gracefully
      // Depending on implementation
    });
  });

  describe('Complex patterns', () => {
    it('should handle mixed compression types', () => {
      const compressedData = new Uint8Array([
        0x00, // Header
        0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, // Common bytes
        ...new Array(32).fill(0), // Skip
        // Copy 2 bytes
        0x02, // times = 2
        0x11, 0x22,
        // Fill with common[0] (0xAA) 3 times
        0x40, // t = 0x10, times = 3
        // Terminate
        0x00,
      ]);

      const buffer = new RomBuffer(compressedData);
      const result = rareDecompress(buffer);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      // First two bytes should be 0x11, 0x22
      expect(result![0]).toBe(0x11);
      expect(result![1]).toBe(0x22);
    });
  });

  describe('Data integrity', () => {
    it('should produce consistent output for same input', () => {
      const compressedData = new Uint8Array([
        0x00,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        ...new Array(32).fill(0),
        0x03,
        0xAA, 0xBB, 0xCC,
        0x00,
      ]);

      const buffer1 = new RomBuffer(new Uint8Array(compressedData));
      const buffer2 = new RomBuffer(new Uint8Array(compressedData));

      const result1 = rareDecompress(buffer1);
      const result2 = rareDecompress(buffer2);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(Array.from(result1!)).toEqual(Array.from(result2!));
    });

    it('should not modify source buffer position permanently', () => {
      const compressedData = new Uint8Array([
        0x00,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        ...new Array(32).fill(0),
        0x00,
      ]);

      const buffer = new RomBuffer(compressedData);
      const initialPos = buffer.getPosition();

      rareDecompress(buffer);

      // Position should be restored due to withScope
      expect(buffer.getPosition()).toBe(initialPos);
    });
  });
});
