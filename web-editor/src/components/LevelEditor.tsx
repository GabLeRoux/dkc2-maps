/**
 * Main Level Editor Component
 */

import React, { useRef, useEffect, useState } from 'react';
import { CartFile } from '@/core/rom-file';
import {
  loadLevelProperties,
  loadLevelStyle,
  loadPalette,
  loadTileGraphics,
  loadTilemap,
  loadLevelSprites,
  decodeSnesTile,
} from '@/core/level';
import { CanvasRenderer } from '@/renderer/canvas-renderer';
import { TileMap, LevelSprite, LevelProperties, LevelStyle } from '@/types';

interface LevelEditorProps {
  romFile: CartFile;
  levelId: number;
}

export const LevelEditor: React.FC<LevelEditorProps> = ({ romFile, levelId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelData, setLevelData] = useState<{
    properties: LevelProperties;
    style: LevelStyle;
    tilemap: TileMap;
    sprites: LevelSprite[];
  } | null>(null);

  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showSprites, setShowSprites] = useState(true);

  // Initialize canvas and renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    rendererRef.current = new CanvasRenderer(canvasRef.current);

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current && rendererRef.current) {
        canvasRef.current.width = window.innerWidth - 300; // Leave space for sidebar
        canvasRef.current.height = window.innerHeight - 100;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Load level data
  useEffect(() => {
    const loadLevel = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load level properties
        const properties = loadLevelProperties(romFile, levelId);

        // Load level style
        const styleAddr = 0x358000 + properties.style * 32; // Estimate
        const style = loadLevelStyle(romFile, styleAddr);

        // Load tilemap
        const tilemap = loadTilemap(romFile, properties, style);

        // Load sprites
        const sprites = loadLevelSprites(romFile, levelId);

        setLevelData({ properties, style, tilemap, sprites });
      } catch (err) {
        console.error('Failed to load level:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadLevel();
  }, [romFile, levelId]);

  // Render level to canvas
  useEffect(() => {
    if (!rendererRef.current || !levelData || !canvasRef.current) return;

    const render = () => {
      const renderer = rendererRef.current!;

      // Set camera view
      renderer.setView(cameraX, cameraY, zoom);

      // Clear canvas
      renderer.clear('#1a1a2e');

      // For now, draw a simple representation
      // In a full implementation, we would decode and render all tiles
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.fillStyle = '#00FF00';
      ctx.font = '20px monospace';
      ctx.fillText(`Level ${levelId} - ${levelData.tilemap.mapWidth}x${levelData.tilemap.mapHeight}`, 20, 40);
      ctx.fillText(`Tiles: ${levelData.tilemap.tiles.size}`, 20, 70);
      ctx.fillText(`Sprites: ${levelData.sprites.length}`, 20, 100);

      if (showGrid) {
        renderer.drawGrid();
      }
    };

    render();
  }, [levelData, cameraX, cameraY, zoom, showGrid, showSprites, levelId]);

  // Handle mouse controls for panning
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = (e.clientX - lastX) / zoom;
        const dy = (e.clientY - lastY) / zoom;
        setCameraX((prev) => prev - dx);
        setCameraY((prev) => prev - dy);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      isPanning = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.max(0.1, Math.min(5, prev * delta)));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [zoom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-xl">Loading level {levelId}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-4 flex items-center gap-4">
        <h2 className="text-white text-xl font-bold">Level {levelId}</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-4 py-2 rounded ${
              showGrid ? 'bg-blue-600' : 'bg-gray-600'
            } text-white hover:bg-blue-700 transition`}
          >
            Grid: {showGrid ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowSprites(!showSprites)}
            className={`px-4 py-2 rounded ${
              showSprites ? 'bg-blue-600' : 'bg-gray-600'
            } text-white hover:bg-blue-700 transition`}
          >
            Sprites: {showSprites ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => {
              setCameraX(0);
              setCameraY(0);
              setZoom(1);
            }}
            className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 transition"
          >
            Reset View
          </button>
        </div>

        <div className="ml-auto text-white">
          Zoom: {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="border border-gray-700"
          style={{ cursor: 'crosshair' }}
        />
      </div>

      <div className="bg-gray-800 p-2 text-white text-sm">
        Controls: Middle-click or Shift+Click to pan • Mouse wheel to zoom
      </div>
    </div>
  );
};
