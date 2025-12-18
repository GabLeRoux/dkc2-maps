/**
 * Level Data Structures
 * Ported from C++ level_properties.cpp, level_style.cpp, tilemap.cpp
 */

import { CartFile, RomBuffer } from './rom-file';
import { rareDecompress } from './decompress';
import {
  Tile,
  TileMap,
  LevelSprite,
  LevelEntry,
  LevelProperties,
  LevelStyle,
  Palette,
  ROM_ADDRESSES,
} from '@/types';

/**
 * Load level properties from ROM
 * Ported from level_properties.cpp
 */
export function loadLevelProperties(cart: CartFile, levelId: number): LevelProperties {
  // Level properties start at address 0x358000
  const levelPropsBase = 0x358000;
  const offset = CartFile.hiromToFile(levelPropsBase + levelId * 16);

  cart.seek(offset);

  const type = cart.readWord();
  const bonusType = cart.readByte();
  const style = cart.readWord();
  const mapIndex = cart.readByte();

  const params: number[] = [];
  for (let i = 0; i < 6; i++) {
    params.push(cart.readByte());
  }

  // Load entries
  const entries: LevelEntry[] = [];
  const entryCount = cart.readByte();
  for (let i = 0; i < entryCount; i++) {
    const p = cart.readByte();
    const x = cart.readWord();
    const y = cart.readWord();
    entries.push({ p, x, y });
  }

  // Load exits
  const exits: number[] = [];
  const exitCount = cart.readByte();
  for (let i = 0; i < exitCount; i++) {
    exits.push(cart.readWord());
  }

  return {
    type,
    bonusType,
    style,
    mapIndex,
    params,
    entries,
    exits,
  };
}

/**
 * Load level style from ROM
 * Ported from level_style.cpp
 */
export function loadLevelStyle(cart: CartFile, styleAddr: number): LevelStyle {
  const offset = CartFile.hiromToFile(styleAddr);
  cart.seek(offset);

  const routine1 = cart.readWord();
  const routine2 = cart.readWord();
  const music = cart.readByte();
  const palette = cart.readWord();
  const fgScroll = cart.readByte();
  const graphics = cart.readByte();
  const mapId = cart.readByte();

  return {
    routine1,
    routine2,
    music,
    palette,
    fgScroll,
    graphics,
    mapId,
  };
}

/**
 * Load palette data from ROM
 * SNES uses 15-bit RGB (5 bits per channel)
 */
export function loadPalette(cart: CartFile, paletteAddr: number, colorCount: number = 16): Palette {
  const offset = CartFile.hiromToFile(paletteAddr);
  cart.seek(offset);

  const colors: number[] = [];

  for (let i = 0; i < colorCount; i++) {
    const snesColor = cart.readWord();

    // Convert SNES 15-bit RGB to 24-bit RGB
    // SNES format: 0bbbbbgggggrrrrr
    const r = (snesColor & 0x1F) << 3;        // Red: bits 0-4
    const g = ((snesColor >> 5) & 0x1F) << 3; // Green: bits 5-9
    const b = ((snesColor >> 10) & 0x1F) << 3; // Blue: bits 10-14

    // Convert to 32-bit RGBA (with alpha = 255)
    const rgba = (r << 24) | (g << 16) | (b << 8) | 0xFF;
    colors.push(rgba);
  }

  return { colors };
}

/**
 * Load tile graphics from ROM
 * SNES tiles are 8x8 pixels, 2 bits per pixel (4 colors per tile)
 */
export function loadTileGraphics(
  cart: CartFile,
  graphicsAddr: number,
  compressed: boolean = true
): Uint8Array {
  const offset = CartFile.hiromToFile(graphicsAddr);
  cart.seek(offset);

  if (compressed) {
    // Read compressed size (first word)
    const compressedSize = cart.readWord();

    // Read compressed data
    const compressedData = cart.readAt(offset, compressedSize);
    const compressedBuffer = new RomBuffer(compressedData);

    // Decompress
    const decompressed = rareDecompress(compressedBuffer);
    if (!decompressed) {
      throw new Error('Failed to decompress tile graphics');
    }

    return decompressed;
  } else {
    // Read uncompressed data
    // Each 8x8 tile is 32 bytes (2bpp format)
    // Assuming max 1024 tiles = 32KB
    const tileData = cart.readAt(offset, 32768);
    return tileData;
  }
}

/**
 * Load tilemap data from ROM
 * Ported from tilemap.cpp
 */
export function loadTilemap(
  cart: CartFile,
  properties: LevelProperties,
  style: LevelStyle
): TileMap {
  // Get tilemap type flags
  const tilemapTypeAddr = ROM_ADDRESSES.TILEMAP_TYPE_FLAGS + style.mapId * 2;
  const tilemapType = cart.readWordAt(CartFile.hiromToFile(tilemapTypeAddr));

  // Get tilemap data pointer
  const tilemapPtrAddr = ROM_ADDRESSES.TILEMAP_DATA_POINTERS + style.mapId * 4;
  const tilemapAddr = cart.readDwordAt(CartFile.hiromToFile(tilemapPtrAddr));

  // Get tilemap address from table
  const tilemapTableAddr = ROM_ADDRESSES.TILEMAP_ADDRESS_TABLE + properties.mapIndex * 4;
  const actualTilemapAddr = cart.readDwordAt(CartFile.hiromToFile(tilemapTableAddr));

  // Load tilemap data
  const offset = CartFile.hiromToFile(actualTilemapAddr);
  cart.seek(offset);

  // Read tilemap header
  const mapX = cart.readWord();
  const mapY = cart.readWord();
  const mapWidth = cart.readWord();
  const mapHeight = cart.readWord();

  // Read tile data
  const tiles = new Map<number, Tile>();

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileWord = cart.readWord();

      // Parse tile word format: FPPPPPPPPPPPPPPP
      // F = flip flags (bits 14-15)
      // P = part ID (bits 0-13)
      const partId = tileWord & 0x3FFF;
      const flipHorz = (tileWord & 0x4000) !== 0;
      const flipVert = (tileWord & 0x8000) !== 0;

      const tileIndex = y * mapWidth + x;
      tiles.set(tileIndex, { partId, flipHorz, flipVert });
    }
  }

  return {
    tilemapType,
    mapX,
    mapY,
    mapWidth,
    mapHeight,
    tilemapAddr: actualTilemapAddr,
    tiles,
  };
}

/**
 * Load sprite data from ROM
 * Ported from level_sprite.cpp
 */
export function loadLevelSprites(cart: CartFile, levelId: number): LevelSprite[] {
  // Sprite data starts at address 0x360000
  const spritesBase = 0x360000;
  const offset = CartFile.hiromToFile(spritesBase + levelId * 1024);

  cart.seek(offset);

  const sprites: LevelSprite[] = [];

  // Read sprites until we hit terminator (0xFFFF)
  while (true) {
    const param = cart.readWord();
    if (param === 0xFFFF) {
      break;
    }

    const x = cart.readWord();
    const y = cart.readWord();
    const propId = cart.readWord();

    sprites.push({
      param,
      x,
      y,
      propId,
      valid: true,
    });
  }

  return sprites;
}

/**
 * Decode 2bpp SNES tile to ImageData
 * Each tile is 8x8 pixels, 2 bits per pixel
 */
export function decodeSnesTile(
  tileData: Uint8Array,
  tileIndex: number,
  palette: Palette
): ImageData {
  const imageData = new ImageData(8, 8);
  const pixels = imageData.data;

  const tileOffset = tileIndex * 32; // 32 bytes per tile (2bpp)

  for (let y = 0; y < 8; y++) {
    // Each row is 2 bytes (plane 0) + 2 bytes (plane 1) = 16 bytes for 8 rows
    const rowOffset = tileOffset + y * 2;

    const plane0 = tileData[rowOffset];
    const plane1 = tileData[rowOffset + 16]; // Plane 1 is 16 bytes after plane 0

    for (let x = 0; x < 8; x++) {
      const bit = 7 - x;
      const colorIndex =
        ((plane0 >> bit) & 1) |
        (((plane1 >> bit) & 1) << 1);

      const color = palette.colors[colorIndex];

      // Extract RGBA from color
      const r = (color >> 24) & 0xFF;
      const g = (color >> 16) & 0xFF;
      const b = (color >> 8) & 0xFF;
      const a = color & 0xFF;

      const pixelIndex = (y * 8 + x) * 4;
      pixels[pixelIndex] = r;
      pixels[pixelIndex + 1] = g;
      pixels[pixelIndex + 2] = b;
      pixels[pixelIndex + 3] = a;
    }
  }

  return imageData;
}

/**
 * Create a 32x32 tile from four 8x8 tiles
 */
export function create32x32Tile(
  tiles: ImageData[],
  flipHorz: boolean = false,
  flipVert: boolean = false
): ImageData {
  const imageData = new ImageData(32, 32);
  const pixels = imageData.data;

  // 32x32 tile is composed of 4x4 grid of 8x8 tiles
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const tileIndex = ty * 4 + tx;
      if (tileIndex >= tiles.length) continue;

      const tile = tiles[tileIndex];

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          let destX = tx * 8 + x;
          let destY = ty * 8 + y;

          if (flipHorz) destX = 31 - destX;
          if (flipVert) destY = 31 - destY;

          const srcIndex = (y * 8 + x) * 4;
          const destIndex = (destY * 32 + destX) * 4;

          pixels[destIndex] = tile.data[srcIndex];
          pixels[destIndex + 1] = tile.data[srcIndex + 1];
          pixels[destIndex + 2] = tile.data[srcIndex + 2];
          pixels[destIndex + 3] = tile.data[srcIndex + 3];
        }
      }
    }
  }

  return imageData;
}
