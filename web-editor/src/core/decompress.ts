/**
 * Rare LZ77 Decompression Algorithm
 * Ported from C++ decompress.cpp
 *
 * This implements the Rare variant of LZ77 compression used in DKC2.
 * The algorithm uses a state machine with multiple encoding types (0x00-0x7B).
 */

import { RomBuffer } from './rom-file';

/**
 * Fill buffer with repeated byte values
 */
function fillBytes(buffer: RomBuffer, byte: number, times: number): void {
  for (let i = 0; i < times; i++) {
    buffer.writeByte(byte);
  }
}

/**
 * Decompress Rare LZ77 compressed data
 * @param src Source buffer containing compressed data
 * @returns Decompressed data as Uint8Array, or null on error
 */
export function rareDecompress(src: RomBuffer): Uint8Array | null {
  try {
    // Create destination buffer (estimate: 3x source size for most cases)
    const estimatedSize = src.getDataSize() * 3;
    const dstData = new Uint8Array(estimatedSize);
    const dst = new RomBuffer(dstData);

    return src.withScope(() => {
      dst.seek(0);
      src.seek(0);

      // Skip first byte
      src.readByte();

      // Read 6 common bytes
      const common = new Uint8Array(6);
      src.read(common, 6);

      // Skip 32 bytes
      for (let i = 0; i < 32; i++) {
        src.readByte();
      }

      let d = src.readByte();
      let t = (d & 0xF0) >> 2;

      const scopePosition = src.getPosition() - 39; // Position after initial skip

      while (true) {
        let times: number, diff: number, y: number, pos: number;
        let b: number, b1: number, b2: number;

        switch (t) {
          case 0x10:
            times = (d & 0x0F) + 3;
            fillBytes(dst, common[0], times);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x08:
            b = src.readByte();
            dst.writeByte(Math.floor(b / 0x10) | ((d % 0x10) << 4));
            d = src.readByte();
            dst.writeByte(((b % 0x10) << 4) | Math.floor(d / 0x10));
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x4F:
            d = src.readByte();
            times = Math.floor(d / 0x10) + 3;
            fillBytes(dst, common[0], times);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x3F:
            d = src.readByte();
            times = Math.floor(d / 0x10);
            if (times === 0) {
              // Decompression complete
              const resultSize = dst.getPosition();
              return dstData.slice(0, resultSize);
            }
            for (let i = 0; i < times; i++) {
              b = src.readByte();
              dst.writeByte(((d % 0x10) << 4) | Math.floor(b / 0x10));
              d = b;
            }
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x43:
            d = src.readByte();
            dst.writeByte(d);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x0C:
            times = (d & 0x0F) + 3;
            d = src.readByte();
            fillBytes(dst, d, times);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x04:
            b = src.readByte();
            dst.writeByte(((d % 0x10) << 4) | Math.floor(b / 0x10));
            d = b;
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x73:
            dst.seek(dst.getPosition() - 1);
            b = dst.readByte();
            dst.writeByte(b);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x4B:
            d = src.readByte();
            times = Math.floor(d / 0x10) + 0x03;
            b = src.readByte();
            fillBytes(dst, ((d % 0x10) << 4) | Math.floor(b / 0x10), times);
            d = b;
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x34:
            dst.seek(dst.getPosition() - 1);
            b = dst.readByte();
            dst.writeByte(b);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x57:
            dst.writeByte(common[4]);
            dst.writeByte(common[5]);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x28:
            times = (d & 0x0F) + 0x03;
            b = src.readByte();
            pos = dst.getPosition() - times - b;
            for (let i = 0; i < times; i++) {
              dst.writeByte(dstData[pos]);
              pos++;
            }
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x47:
            d = src.readByte();
            dst.writeByte(d);
            d = src.readByte();
            dst.writeByte(d);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x24:
            pos = dst.getPosition() - ((d & 0x0F) + 0x02);
            dst.writeByte(dstData[pos]);
            pos++;
            dst.writeByte(dstData[pos]);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x63:
            d = src.readByte();
            pos = dst.getPosition() - (Math.floor(d / 0x10) + 0x02);
            dst.writeByte(dstData[pos]);
            pos++;
            dst.writeByte(dstData[pos]);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x1C:
            dst.writeByte(common[2]);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x3C:
            pos = ((d & 0x0F) << 1) + 0x07;
            pos += scopePosition;
            dst.writeByte(src.readByteAt(pos));
            pos++;
            dst.writeByte(src.readByteAt(pos));
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x20:
            dst.writeByte(common[3]);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x7B:
            d = src.readByte();
            pos = ((d & 0xF0) >> 3) + 0x07;
            pos += scopePosition;
            dst.writeByte(src.readByteAt(pos));
            pos++;
            dst.writeByte(src.readByteAt(pos));
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x5F:
            dst.writeByte(common[3]);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x00:
            times = d & 0x0F;
            if (times === 0) {
              // Decompression complete
              const resultSize = dst.getPosition();
              return dstData.slice(0, resultSize);
            }
            for (let i = 0; i < times; i++) {
              d = src.readByte();
              dst.writeByte(d);
            }
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x67:
            b = src.readByte();
            times = Math.floor(b / 16) + 0x03;
            d = src.readByte();
            diff = times + (((b % 16) << 4) | Math.floor(d / 16));
            pos = dst.getPosition() - diff;
            for (let i = 0; i < times; i++) {
              dst.writeByte(dstData[pos]);
              pos++;
            }
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x5B:
            dst.writeByte(common[2]);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x18:
            dst.writeByte(common[4]);
            dst.writeByte(common[5]);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x6B:
            d = src.readByte();
            times = Math.floor(d / 0x10) + 0x03;
            b = src.readByte();
            diff = (((d & 0x0F) << 8) | b) + 0x0103;
            pos = dst.getPosition() - diff;
            for (let i = 0; i < times; i++) {
              dst.writeByte(dstData[pos]);
              pos++;
            }
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x2C:
            times = (d & 0x0F) + 0x03;
            b = src.readByte();
            y = b;
            d = src.readByte();
            pos = dst.getPosition() - ((((y << 8) | d) >> 4) + 0x0103);
            for (let i = 0; i < times; i++) {
              dst.writeByte(dstData[pos]);
              pos++;
            }
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x14:
            times = (d & 0x0F) + 0x03;
            for (let i = 0; i < times; i++) {
              dst.writeByte(common[1]);
            }
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x53:
            d = src.readByte();
            times = Math.floor(d / 0x10) + 0x03;
            for (let i = 0; i < times; i++) {
              dst.writeByte(common[1]);
            }
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x6F:
            d = src.readByte();
            times = Math.floor(d / 0x10) + 0x03;
            b = src.readByte();
            y = b;
            diff = (((d << 8) | y) << 4) & 0xFFFF;
            d = src.readByte();
            diff |= Math.floor(d / 0x10) & 0xFF;
            pos = dst.getPosition() - diff;
            for (let i = 0; i < times; i++) {
              dst.writeByte(dstData[pos]);
              pos++;
            }
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x77:
            pos = dst.getPosition();
            dst.writeByte(dstData[pos - 2]);
            dst.writeByte(dstData[pos - 1]);
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          case 0x38:
            pos = dst.getPosition();
            dst.writeByte(dstData[pos - 2]);
            dst.writeByte(dstData[pos - 1]);
            t = ((d & 0x0F) << 2) + 0x3F;
            break;

          case 0x30:
            times = (d & 0x0F) + 0x03;
            b1 = src.readByte();
            b2 = src.readByte();
            y = (b1 << 8) | b2;
            pos = dst.getPosition() - y;
            for (let i = 0; i < times; i++) {
              dst.writeByte(dstData[pos]);
              pos++;
            }
            d = src.readByte();
            t = (d & 0xF0) >> 2;
            break;

          default:
            console.error(`Unknown decompression type: 0x${t.toString(16)}`);
            return null;
        }
      }
    });
  } catch (error) {
    console.error('Decompression error:', error);
    return null;
  }
}
