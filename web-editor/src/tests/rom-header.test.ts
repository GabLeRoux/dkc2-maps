import { describe, it, expect, vi } from 'vitest';
import { CartFile } from '@/core/rom-file';
import { ROM_SIZE, VALIDATION_OFFSET, VALIDATION_STRING } from '@/types';

describe('ROM Header Detection', () => {
  const createMockRom = (includeHeader: boolean = false): Uint8Array => {
    const HEADER_SIZE = 512;
    const dataSize = includeHeader ? ROM_SIZE + HEADER_SIZE : ROM_SIZE;
    const data = new Uint8Array(dataSize);

    // Calculate where to write validation string based on header presence
    const validationOffset = includeHeader ? VALIDATION_OFFSET + HEADER_SIZE : VALIDATION_OFFSET;

    // Write validation string "DIDDY ASSEMBLY"
    const validationBytes = new TextEncoder().encode(VALIDATION_STRING);
    for (let i = 0; i < validationBytes.length; i++) {
      data[validationOffset + i] = validationBytes[i];
    }

    return data;
  };

  describe('Headerless ROM (.sfc)', () => {
    it('should load headerless ROM correctly', () => {
      const romData = createMockRom(false);
      expect(romData.length).toBe(ROM_SIZE);

      const cart = new CartFile(romData);
      expect(cart.isValid()).toBe(true);
      expect(cart.getDataSize()).toBe(ROM_SIZE);
    });

    it('should validate headerless ROM size', () => {
      const romData = createMockRom(false);
      expect(() => new CartFile(romData)).not.toThrow();
    });
  });

  describe('Headered ROM (.smc)', () => {
    it('should detect and strip 512-byte header', () => {
      const romDataWithHeader = createMockRom(true);
      expect(romDataWithHeader.length).toBe(ROM_SIZE + 512);

      // CartFile.fromArrayBuffer should strip the header
      const cart = CartFile.fromArrayBuffer(romDataWithHeader.buffer as ArrayBuffer);
      expect(cart.isValid()).toBe(true);
      expect(cart.getDataSize()).toBe(ROM_SIZE);
    });

    it('should validate ROM after stripping header', () => {
      const romDataWithHeader = createMockRom(true);
      const cart = CartFile.fromArrayBuffer(romDataWithHeader.buffer as ArrayBuffer);

      // After stripping header, validation should succeed
      expect(cart.isValid()).toBe(true);
    });
  });

  describe('Size validation', () => {
    it('should reject ROMs that are too small', () => {
      const tooSmall = new Uint8Array(ROM_SIZE - 10000);
      expect(() => new CartFile(tooSmall)).toThrow('Invalid ROM size');
    });

    it('should reject ROMs that are too large', () => {
      const tooLarge = new Uint8Array(ROM_SIZE + 10000);
      expect(() => new CartFile(tooLarge)).toThrow('Invalid ROM size');
    });

    it('should accept ROMs within tolerance (±1KB)', () => {
      // Create a ROM that's slightly off (within 1KB tolerance)
      const slightlyOff = createMockRom(false);
      const almostCorrect = new Uint8Array(ROM_SIZE + 512); // Within tolerance
      almostCorrect.set(slightlyOff);

      // Write validation string
      const validationBytes = new TextEncoder().encode(VALIDATION_STRING);
      for (let i = 0; i < validationBytes.length; i++) {
        almostCorrect[VALIDATION_OFFSET + i] = validationBytes[i];
      }

      // Should not throw because it's within tolerance
      const cart = new CartFile(almostCorrect);
      expect(cart.isValid()).toBe(true);
    });
  });

  describe('Validation string', () => {
    it('should find validation string at correct offset', () => {
      const romData = createMockRom(false);
      const cart = new CartFile(romData);

      // Validation should have succeeded
      expect(cart.isValid()).toBe(true);
    });

    it('should reject ROM without validation string', () => {
      const invalidRom = new Uint8Array(ROM_SIZE);
      // No validation string written

      expect(() => new CartFile(invalidRom)).toThrow('Validation string not found');
    });

    it('should provide detailed error for wrong validation string', () => {
      const invalidRom = new Uint8Array(ROM_SIZE);
      // Write wrong string
      const wrongString = 'WRONG STRING';
      const wrongBytes = new TextEncoder().encode(wrongString);
      for (let i = 0; i < wrongBytes.length; i++) {
        invalidRom[VALIDATION_OFFSET + i] = wrongBytes[i];
      }

      try {
        new CartFile(invalidRom);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMsg = (error as Error).message;
        expect(errorMsg).toContain('Validation string not found');
        expect(errorMsg).toContain('DIDDY ASSEMBLY');
        expect(errorMsg).toContain('Hex dump');
      }
    });
  });

  describe('Console logging', () => {
    it('should log verbose information during validation', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const romData = createMockRom(false);

      new CartFile(romData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validating DKC2 ROM')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ROM validation successful')
      );

      consoleSpy.mockRestore();
    });

    it('should log errors to console on validation failure', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const invalidRom = new Uint8Array(ROM_SIZE);

      try {
        new CartFile(invalidRom);
      } catch {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
