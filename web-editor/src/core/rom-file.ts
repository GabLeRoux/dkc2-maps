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
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return new CartFile(data);
  }

  /**
   * Load ROM from ArrayBuffer
   */
  static fromArrayBuffer(arrayBuffer: ArrayBuffer): CartFile {
    const data = new Uint8Array(arrayBuffer);
    return new CartFile(data);
  }

  /**
   * Validate ROM file (ported from C++ CartFile::IsValid)
   * Checks for "DIDDY ASSEMBLY" string at offset 0x3F0000
   */
  private validate(): void {
    // Check file size
    if (this.getDataSize() !== ROM_SIZE) {
      throw new Error(
        `Invalid ROM size: expected ${ROM_SIZE} bytes (4MB HiROM), got ${this.getDataSize()} bytes`
      );
    }

    // Check for validation string
    const validationStr = this.readString(VALIDATION_OFFSET);
    if (validationStr !== VALIDATION_STRING) {
      throw new Error(
        `Invalid ROM: validation string not found at offset 0x${VALIDATION_OFFSET.toString(16)}`
      );
    }

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
    return new Blob([this.export()], { type: 'application/octet-stream' });
  }
}
