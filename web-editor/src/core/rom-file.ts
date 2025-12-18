/**
 * ROM File Parser - Ported from C++ rom_file.cpp
 * Handles SNES HiROM cartridge binary data reading/writing
 */

import { ROM_SIZE, VALIDATION_STRING, VALIDATION_OFFSET, HIROM_BASE } from '@/types';

export class RomBuffer {
  private data: Uint8Array;
  private pos: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  // Position management
  seek(position: number): void {
    this.pos = position;
  }

  getPosition(): number {
    return this.pos;
  }

  getDataSize(): number {
    return this.data.length;
  }

  getData(): Uint8Array {
    return this.data;
  }

  // Read operations
  readByte(): number {
    if (this.pos >= this.data.length) {
      throw new Error('Buffer overflow: attempting to read beyond buffer size');
    }
    return this.data[this.pos++];
  }

  readWord(): number {
    // Little-endian 16-bit word
    const low = this.readByte();
    const high = this.readByte();
    return low | (high << 8);
  }

  readDword(): number {
    // Little-endian 32-bit double word
    const b1 = this.readByte();
    const b2 = this.readByte();
    const b3 = this.readByte();
    const b4 = this.readByte();
    return b1 | (b2 << 8) | (b3 << 16) | (b4 << 24);
  }

  read(buffer: Uint8Array, size: number): void {
    if (this.pos + size > this.data.length) {
      throw new Error('Buffer overflow: attempting to read beyond buffer size');
    }
    buffer.set(this.data.slice(this.pos, this.pos + size));
    this.pos += size;
  }

  readAt(offset: number, size: number): Uint8Array {
    if (offset + size > this.data.length) {
      throw new Error('Buffer overflow: attempting to read beyond buffer size');
    }
    return this.data.slice(offset, offset + size);
  }

  readByteAt(offset: number): number {
    if (offset >= this.data.length) {
      throw new Error('Buffer overflow: attempting to read beyond buffer size');
    }
    return this.data[offset];
  }

  readWordAt(offset: number): number {
    if (offset + 1 >= this.data.length) {
      throw new Error('Buffer overflow: attempting to read beyond buffer size');
    }
    const low = this.data[offset];
    const high = this.data[offset + 1];
    return low | (high << 8);
  }

  readDwordAt(offset: number): number {
    if (offset + 3 >= this.data.length) {
      throw new Error('Buffer overflow: attempting to read beyond buffer size');
    }
    const b1 = this.data[offset];
    const b2 = this.data[offset + 1];
    const b3 = this.data[offset + 2];
    const b4 = this.data[offset + 3];
    return b1 | (b2 << 8) | (b3 << 16) | (b4 << 24);
  }

  readString(offset: number): string {
    let result = '';
    let pos = offset;
    while (pos < this.data.length) {
      const char = this.data[pos];
      if (char === 0) break;
      result += String.fromCharCode(char);
      pos++;
    }
    return result;
  }

  // Write operations
  writeByte(value: number): void {
    if (this.pos >= this.data.length) {
      throw new Error('Buffer overflow: attempting to write beyond buffer size');
    }
    this.data[this.pos++] = value & 0xFF;
  }

  writeWord(value: number): void {
    this.writeByte(value & 0xFF);
    this.writeByte((value >> 8) & 0xFF);
  }

  writeDword(value: number): void {
    this.writeByte(value & 0xFF);
    this.writeByte((value >> 8) & 0xFF);
    this.writeByte((value >> 16) & 0xFF);
    this.writeByte((value >> 24) & 0xFF);
  }

  write(buffer: Uint8Array, size: number): void {
    if (this.pos + size > this.data.length) {
      throw new Error('Buffer overflow: attempting to write beyond buffer size');
    }
    this.data.set(buffer.slice(0, size), this.pos);
    this.pos += size;
  }

  writeAt(offset: number, buffer: Uint8Array, size: number): void {
    if (offset + size > this.data.length) {
      throw new Error('Buffer overflow: attempting to write beyond buffer size');
    }
    this.data.set(buffer.slice(0, size), offset);
  }

  writeByteAt(offset: number, value: number): void {
    if (offset >= this.data.length) {
      throw new Error('Buffer overflow: attempting to write beyond buffer size');
    }
    this.data[offset] = value & 0xFF;
  }

  writeWordAt(offset: number, value: number): void {
    this.writeByteAt(offset, value & 0xFF);
    this.writeByteAt(offset + 1, (value >> 8) & 0xFF);
  }

  writeDwordAt(offset: number, value: number): void {
    this.writeByteAt(offset, value & 0xFF);
    this.writeByteAt(offset + 1, (value >> 8) & 0xFF);
    this.writeByteAt(offset + 2, (value >> 16) & 0xFF);
    this.writeByteAt(offset + 3, (value >> 24) & 0xFF);
  }

  // Scope management (for preserving position)
  withScope<T>(fn: () => T): T {
    const savedPos = this.pos;
    try {
      return fn();
    } finally {
      this.pos = savedPos;
    }
  }
}

export class CartFile extends RomBuffer {
  private valid: boolean = false;

  constructor(data: Uint8Array) {
    super(data);
    this.validate();
  }

  /**
   * Load ROM from File object (browser file upload)
   */
  static async fromFile(file: File): Promise<CartFile> {
    console.log(`Loading ROM file: ${file.name} (${file.size} bytes)`);
    const arrayBuffer = await file.arrayBuffer();
    let data = new Uint8Array(arrayBuffer);

    // Detect and strip 512-byte header if present
    const hasHeader = CartFile.detectHeader(data);
    if (hasHeader) {
      console.log('Detected 512-byte SNES ROM header, stripping it...');
      data = data.slice(512);
      console.log(`ROM size after header removal: ${data.length} bytes`);
    }

    return new CartFile(data);
  }

  /**
   * Load ROM from ArrayBuffer
   */
  static fromArrayBuffer(arrayBuffer: ArrayBuffer): CartFile {
    let data = new Uint8Array(arrayBuffer);

    // Detect and strip 512-byte header if present
    const hasHeader = CartFile.detectHeader(data);
    if (hasHeader) {
      console.log('Detected 512-byte SNES ROM header, stripping it...');
      data = data.slice(512);
    }

    return new CartFile(data);
  }

  /**
   * Detect if ROM has a 512-byte header (.smc format)
   * SNES ROMs can be either:
   * - Headerless (.sfc): exactly 4MB (0x400000 bytes)
   * - Headered (.smc): 4MB + 512 bytes (0x400200 bytes)
   */
  private static detectHeader(data: Uint8Array): boolean {
    const size = data.length;
    const HEADER_SIZE = 512;
    const ROM_SIZE_WITH_HEADER = ROM_SIZE + HEADER_SIZE;

    console.log(`ROM file size: ${size} bytes (0x${size.toString(16)})`);

    // If size matches exactly 4MB + 512 bytes, it has a header
    if (size === ROM_SIZE_WITH_HEADER) {
      console.log('ROM size matches 4MB + 512 bytes (.smc format)');
      return true;
    }

    // If size is exactly 4MB, no header
    if (size === ROM_SIZE) {
      console.log('ROM size matches exactly 4MB (.sfc format)');
      return false;
    }

    // If size is close to 4MB but not exact, check if adding/removing header helps
    if (size > ROM_SIZE && size < ROM_SIZE_WITH_HEADER + 1024) {
      console.log('ROM size is close to 4MB + 512, assuming headered format');
      return true;
    }

    console.log('ROM size does not match standard formats');
    return false;
  }

  /**
   * Validate ROM file (ported from C++ CartFile::IsValid)
   * Checks for "DIDDY ASSEMBLY" string at offset 0x3F0000
   */
  private validate(): void {
    console.log('Validating DKC2 ROM...');

    // Check file size with tolerance
    const actualSize = this.getDataSize();
    const sizeDiff = actualSize - ROM_SIZE;

    console.log(`Expected size: ${ROM_SIZE} bytes (0x${ROM_SIZE.toString(16)})`);
    console.log(`Actual size: ${actualSize} bytes (0x${actualSize.toString(16)})`);
    console.log(`Size difference: ${sizeDiff} bytes`);

    if (actualSize !== ROM_SIZE) {
      // Check if it's close enough (within 1KB tolerance for slight variations)
      if (Math.abs(sizeDiff) > 1024) {
        const errorMsg = [
          `Invalid ROM size detected:`,
          `  Expected: ${ROM_SIZE} bytes (4MB HiROM)`,
          `  Got: ${actualSize} bytes (${(actualSize / 1024 / 1024).toFixed(2)}MB)`,
          `  Difference: ${sizeDiff > 0 ? '+' : ''}${sizeDiff} bytes`,
          ``,
          `Supported formats:`,
          `  - Headerless (.sfc): exactly 4,194,304 bytes`,
          `  - Headered (.smc): 4,194,816 bytes (4MB + 512-byte header)`,
          ``,
          `Your ROM file appears to be non-standard.`,
          `Please ensure you have a valid DKC2 SNES ROM dump.`,
        ].join('\n');

        console.error(errorMsg);
        throw new Error(errorMsg);
      } else {
        console.warn(`ROM size is slightly off (${sizeDiff} bytes), but within tolerance. Continuing...`);
      }
    }

    // Check for validation string at standard offset
    console.log(`Checking for validation string starting with "${VALIDATION_STRING}" at offset 0x${VALIDATION_OFFSET.toString(16)}...`);
    const validationStr = this.readString(VALIDATION_OFFSET);
    console.log(`Found string: "${validationStr}"`);

    if (!validationStr.startsWith(VALIDATION_STRING)) {
      // Try reading some bytes around the validation offset to help debug
      const debugBytes: number[] = [];
      for (let i = 0; i < 32 && VALIDATION_OFFSET + i < this.getDataSize(); i++) {
        debugBytes.push(this.readByteAt(VALIDATION_OFFSET + i));
      }

      const debugHex = debugBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
      const debugAscii = debugBytes.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');

      const errorMsg = [
        `Invalid DKC2 ROM: Validation string not found`,
        ``,
        `Expected string starting with: "${VALIDATION_STRING}" at offset 0x${VALIDATION_OFFSET.toString(16)}`,
        `Found: "${validationStr.substring(0, 50)}${validationStr.length > 50 ? '...' : ''}"`,
        ``,
        `Hex dump at validation offset:`,
        `  ${debugHex}`,
        `  ${debugAscii}`,
        ``,
        `This may not be a valid DKC2 ROM file, or it may be from a different`,
        `version/region. The editor currently only supports the standard release.`,
      ].join('\n');

      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Log the full validation string found (for informational purposes)
    if (validationStr !== VALIDATION_STRING) {
      console.log(`ℹ ROM contains extended validation string: "${validationStr}"`);
      console.log('This appears to be a development or alternative build of DKC2.');
    }

    console.log('✓ ROM validation successful!');
    this.valid = true;
  }

  isValid(): boolean {
    return this.valid;
  }

  /**
   * Convert HiROM address to file offset
   * HiROM addresses start at 0xC00000
   */
  static hiromToFile(address: number): number {
    if (address < HIROM_BASE) {
      throw new Error(`Invalid HiROM address: 0x${address.toString(16)} (must be >= 0xC00000)`);
    }
    return address - HIROM_BASE;
  }

  /**
   * Convert file offset to HiROM address
   */
  static fileToHirom(offset: number): number {
    return offset + HIROM_BASE;
  }

  /**
   * Read from HiROM address
   */
  readAtHirom(address: number): number {
    const offset = CartFile.hiromToFile(address);
    return this.readByteAt(offset);
  }

  /**
   * Read word from HiROM address
   */
  readWordAtHirom(address: number): number {
    const offset = CartFile.hiromToFile(address);
    return this.readWordAt(offset);
  }

  /**
   * Read dword from HiROM address
   */
  readDwordAtHirom(address: number): number {
    const offset = CartFile.hiromToFile(address);
    return this.readDwordAt(offset);
  }

  /**
   * Export ROM data as Uint8Array for download
   */
  export(): Uint8Array {
    return new Uint8Array(this.getData());
  }

  /**
   * Export ROM data as Blob for download
   */
  exportAsBlob(): Blob {
    const data = this.export();
    return new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  }
}
