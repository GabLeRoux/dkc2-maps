// Core DKC2 data types ported from C++ codebase

export interface Tile {
  partId: number;      // Tile graphics index (DWORD in C++)
  flipHorz: boolean;   // Horizontal flip flag (bit 0x4000)
  flipVert: boolean;   // Vertical flip flag (bit 0x8000)
}

export interface TileMap {
  tilemapType: number;
  mapX: number;
  mapY: number;
  mapWidth: number;
  mapHeight: number;
  tilemapAddr: number;
  tiles: Map<number, Tile>;
}

export interface LevelSprite {
  param: number;       // Sprite parameter
  x: number;           // X coordinate (16-bit with 256-pixel offset)
  y: number;           // Y coordinate (16-bit with 256-pixel offset)
  propId: number;      // Property ID (sprite type)
  valid: boolean;
}

export interface LevelEntry {
  p: number;           // Entry parameter
  x: number;           // X coordinate
  y: number;           // Y coordinate
}

export interface LevelProperties {
  type: number;        // Level type
  bonusType: number;   // Bonus level flag
  style: number;       // Visual style
  mapIndex: number;    // Map variant
  params: number[];    // Additional parameters (6 bytes)
  entries: LevelEntry[];  // Entry points
  exits: number[];     // Exit points
}

export interface LevelStyle {
  routine1: number;    // Routine ID 1
  routine2: number;    // Routine ID 2
  music: number;       // Music track
  palette: number;     // Palette reference
  fgScroll: number;    // Foreground scroll type
  graphics: number;    // Graphics ID
  mapId: number;       // Map ID
}

export interface Palette {
  colors: number[];    // RGB color values (16 colors per palette)
}

export interface Animation {
  frames: ImageData[];
  durations: number[];
}

export interface SpriteProperty {
  id: number;
  name: string;
  animations: Animation[];
}

// ROM file constants
export const ROM_SIZE = 0x400000;  // 4MB SNES HiROM
export const VALIDATION_STRING = 'DIDDY ASSEMBLY';
export const VALIDATION_OFFSET = 0x3F0000;

// HiROM address mapping
export const HIROM_BASE = 0xC00000;

// ROM address lookup tables (from C++ codebase)
export const ROM_ADDRESSES = {
  TILE_GRAPHICS_POINTERS: 0x35BB2E,
  GRAPHICS_DATA_POINTERS: 0x3D819A,
  DEFAULT_PALETTE_ADDRESSES: 0x35BC2A,
  TILEMAP_TYPE_FLAGS: 0x35BC54,
  TILEMAP_DATA_POINTERS: 0x35BC7E,
  TILEMAP_ADDRESS_TABLE: 0x35BAEF,
  SPRITE_GRAPHICS_ADDRESSES: 0x3C8000,
  PALETTE_DATA_START: 0x3D1710,
  PALETTE_DATA_END: 0x3D3A4E,
} as const;
