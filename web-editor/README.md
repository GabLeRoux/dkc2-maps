# DKC2 Web Level Editor

A modern web-based level editor for Donkey Kong Country 2, built with React, TypeScript, and HTML5 Canvas.

## Features

- **ROM Parsing**: Load and parse SNES HiROM cartridge files directly in the browser
- **Rare LZ77 Decompression**: Port of the original decompression algorithm from C++
- **Level Rendering**: HTML5 Canvas-based rendering of tilemaps and sprites
- **Interactive Editing**: Pan, zoom, and navigate through levels
- **Export Functionality**: Save modified ROMs back to your device

## Technology Stack

- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Vitest**: Unit testing framework
- **TailwindCSS**: Utility-first styling
- **HTML5 Canvas**: Pixel-perfect rendering

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

### Build

```bash
npm run build
```

## Architecture

### Core Logic (`src/core/`)

- `rom-file.ts`: SNES HiROM file parsing and binary data handling
- `decompress.ts`: Rare LZ77 decompression algorithm
- `level.ts`: Level data structures (tilemaps, sprites, palettes)

### Renderer (`src/renderer/`)

- `canvas-renderer.ts`: HTML5 Canvas rendering engine

### Components (`src/components/`)

- `RomUploader.tsx`: File upload and validation
- `LevelEditor.tsx`: Main editor interface
- `App.tsx`: Application root

## Original C++ Codebase

This web editor is a port of the original DKC2 Editor by Francis Renaud (2008), reusing the core game logic:

- ROM file parsing from `rom_file.cpp`
- Rare LZ77 decompression from `decompress.cpp`
- Tilemap rendering from `tilemap.cpp`
- Level data structures from `level_properties.cpp`, `level_style.cpp`

## Usage

1. **Load ROM**: Upload a DKC2 SNES ROM file (.sfc or .smc)
2. **Select Level**: Choose a level from the sidebar
3. **Navigate**:
   - Middle-click or Shift+Click to pan
   - Mouse wheel to zoom
4. **Edit**: (Future feature)
5. **Export**: Save your modifications

## Testing

The project includes comprehensive tests for:

- ROM file parsing and validation
- Binary data reading/writing
- HiROM address translation
- Rare LZ77 decompression
- Tile decoding and rendering
- Canvas rendering operations

Run `npm test` to execute all tests.

## License

MIT License (same as original project)

## Credits

- Original DKC2 Editor: Francis Renaud (2008)
- Web Port: Built with modern web technologies (2024)
