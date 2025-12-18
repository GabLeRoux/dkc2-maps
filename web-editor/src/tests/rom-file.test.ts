import { describe, it, expect, beforeEach } from 'vitest';
import { RomBuffer, CartFile } from '@/core/rom-file';
import { ROM_SIZE, VALIDATION_OFFSET, VALIDATION_STRING } from '@/types';

describe('RomBuffer', () => {
  let buffer: RomBuffer;

  beforeEach(() => {
    // Create a test buffer with sample data
    const data = new Uint8Array(1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }
    buffer = new RomBuffer(data);
  });

  describe('Position management', () => {
    it('should start at position 0', () => {
      expect(buffer.getPosition()).toBe(0);
    });

    it('should seek to a new position', () => {
      buffer.seek(100);
      expect(buffer.getPosition()).toBe(100);
    });

    it('should get data size', () => {
      expect(buffer.getDataSize()).toBe(1024);
    });
  });

  describe('Read operations', () => {
    it('should read a byte', () => {
      const byte = buffer.readByte();
      expect(byte).toBe(0);
      expect(buffer.getPosition()).toBe(1);
    });

    it('should read multiple bytes', () => {
      const bytes = [
        buffer.readByte(),
        buffer.readByte(),
        buffer.readByte(),
      ];
      expect(bytes).toEqual([0, 1, 2]);
      expect(buffer.getPosition()).toBe(3);
    });

    it('should read a word (little-endian)', () => {
      buffer.seek(0);
      buffer.getData()[0] = 0x34;
      buffer.getData()[1] = 0x12;
      const word = buffer.readWord();
      expect(word).toBe(0x1234);
    });

    it('should read a dword (little-endian)', () => {
      buffer.seek(0);
      buffer.getData()[0] = 0x78;
      buffer.getData()[1] = 0x56;
      buffer.getData()[2] = 0x34;
      buffer.getData()[3] = 0x12;
      const dword = buffer.readDword();
      expect(dword).toBe(0x12345678);
    });

    it('should read at specific offset', () => {
      const byte = buffer.readByteAt(100);
      expect(byte).toBe(100);
      expect(buffer.getPosition()).toBe(0); // Position unchanged
    });

    it('should read string', () => {
      const data = buffer.getData();
      data[0] = 0x48; // 'H'
      data[1] = 0x45; // 'E'
      data[2] = 0x4C; // 'L'
      data[3] = 0x4C; // 'L'
      data[4] = 0x4F; // 'O'
      data[5] = 0x00; // null terminator

      const str = buffer.readString(0);
      expect(str).toBe('HELLO');
    });

    it('should throw on buffer overflow', () => {
      buffer.seek(1024);
      expect(() => buffer.readByte()).toThrow('Buffer overflow');
    });
  });

  describe('Write operations', () => {
    it('should write a byte', () => {
      buffer.writeByte(0xFF);
      expect(buffer.getData()[0]).toBe(0xFF);
      expect(buffer.getPosition()).toBe(1);
    });

    it('should write a word (little-endian)', () => {
      buffer.writeWord(0x1234);
      expect(buffer.getData()[0]).toBe(0x34);
      expect(buffer.getData()[1]).toBe(0x12);
    });

    it('should write a dword (little-endian)', () => {
      buffer.writeDword(0x12345678);
      expect(buffer.getData()[0]).toBe(0x78);
      expect(buffer.getData()[1]).toBe(0x56);
      expect(buffer.getData()[2]).toBe(0x34);
      expect(buffer.getData()[3]).toBe(0x12);
    });

    it('should write at specific offset', () => {
      buffer.writeByteAt(100, 0xAB);
      expect(buffer.getData()[100]).toBe(0xAB);
    });
  });

  describe('Scope management', () => {
    it('should preserve position after scope', () => {
      buffer.seek(50);
      const result = buffer.withScope(() => {
        buffer.seek(100);
        expect(buffer.getPosition()).toBe(100);
        return 42;
      });
      expect(buffer.getPosition()).toBe(50); // Restored
      expect(result).toBe(42);
    });

    it('should restore position even on error', () => {
      buffer.seek(50);
      try {
        buffer.withScope(() => {
          buffer.seek(100);
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected
      }
      expect(buffer.getPosition()).toBe(50); // Still restored
    });
  });
});

describe('CartFile', () => {
  let mockRomData: Uint8Array;

  beforeEach(() => {
    // Create a mock ROM file with proper validation
    mockRomData = new Uint8Array(ROM_SIZE);

    // Write validation string "DIDDY ASSEMBLY" at offset 0x3F0000
    const validationBytes = new TextEncoder().encode(VALIDATION_STRING);
    for (let i = 0; i < validationBytes.length; i++) {
      mockRomData[VALIDATION_OFFSET + i] = validationBytes[i];
    }
  });

  describe('Validation', () => {
    it('should validate correct ROM file', () => {
      const cart = new CartFile(mockRomData);
      expect(cart.isValid()).toBe(true);
    });

    it('should reject wrong size ROM', () => {
      const wrongSize = new Uint8Array(1024);
      expect(() => new CartFile(wrongSize)).toThrow('Invalid ROM size');
    });

    it('should reject ROM without validation string', () => {
      const invalidRom = new Uint8Array(ROM_SIZE);
      expect(() => new CartFile(invalidRom)).toThrow('Validation string not found');
    });
  });

  describe('HiROM address translation', () => {
    it('should convert HiROM address to file offset', () => {
      const hiromAddr = 0xC00000;
      const fileOffset = CartFile.hiromToFile(hiromAddr);
      expect(fileOffset).toBe(0);
    });

    it('should convert file offset to HiROM address', () => {
      const fileOffset = 0x1000;
      const hiromAddr = CartFile.fileToHirom(fileOffset);
      expect(hiromAddr).toBe(0xC01000);
    });

    it('should throw on invalid HiROM address', () => {
      expect(() => CartFile.hiromToFile(0x100000)).toThrow('Invalid HiROM address');
    });
  });

  describe('HiROM reading', () => {
    it('should read byte from HiROM address', () => {
      const cart = new CartFile(mockRomData);
      cart.getData()[0] = 0xAB;
      const value = cart.readAtHirom(0xC00000);
      expect(value).toBe(0xAB);
    });

    it('should read word from HiROM address', () => {
      const cart = new CartFile(mockRomData);
      cart.getData()[0] = 0x34;
      cart.getData()[1] = 0x12;
      const value = cart.readWordAtHirom(0xC00000);
      expect(value).toBe(0x1234);
    });

    it('should read dword from HiROM address', () => {
      const cart = new CartFile(mockRomData);
      cart.getData()[0] = 0x78;
      cart.getData()[1] = 0x56;
      cart.getData()[2] = 0x34;
      cart.getData()[3] = 0x12;
      const value = cart.readDwordAtHirom(0xC00000);
      expect(value).toBe(0x12345678);
    });
  });

  describe('Export', () => {
    it('should export as Uint8Array', () => {
      const cart = new CartFile(mockRomData);
      const exported = cart.export();
      expect(exported).toBeInstanceOf(Uint8Array);
      expect(exported.length).toBe(ROM_SIZE);
    });

    it('should export as Blob', () => {
      const cart = new CartFile(mockRomData);
      const blob = cart.exportAsBlob();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(ROM_SIZE);
      expect(blob.type).toBe('application/octet-stream');
    });
  });
});
