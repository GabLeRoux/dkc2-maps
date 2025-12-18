/**
 * Main Application Component
 */

import React, { useState } from 'react';
import { CartFile } from '@/core/rom-file';
import { RomUploader } from '@/components/RomUploader';
import { LevelEditor } from '@/components/LevelEditor';

function App() {
  const [romFile, setRomFile] = useState<CartFile | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [showLevelList, setShowLevelList] = useState(false);

  // DKC2 level names (from level_name.cpp)
  const levelNames = [
    'Pirate Panic',
    'Mainbrace Mayhem',
    'Gangplank Galley',
    'Lockjaw\'s Saga',
    'Topsail Trouble',
    'Krow\'s Nest',
    'Hot-Head Hop',
    'Kannon\'s Klaim',
    'Lava Lagoon',
    'Red-Hot Ride',
    'Squawks\'s Shaft',
    'Kleever\'s Kiln',
    // Add more level names as needed
  ];

  const handleRomLoaded = (rom: CartFile) => {
    setRomFile(rom);
  };

  const handleLevelSelect = (levelId: number) => {
    setSelectedLevel(levelId);
    setShowLevelList(false);
  };

  if (!romFile) {
    return <RomUploader onRomLoaded={handleRomLoaded} />;
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">DKC2 Editor</h1>
          <p className="text-sm text-gray-400 mt-1">Web Level Editor</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">CURRENT LEVEL</h2>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-white font-medium">
                {levelNames[selectedLevel] || `Level ${selectedLevel}`}
              </div>
              <div className="text-sm text-gray-400 mt-1">ID: {selectedLevel}</div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">LEVELS</h2>
            <div className="space-y-1">
              {levelNames.slice(0, 12).map((name, index) => (
                <button
                  key={index}
                  onClick={() => handleLevelSelect(index)}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedLevel === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-gray-400">Level {index}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">ACTIONS</h2>
            <button
              onClick={() => {
                const blob = romFile.exportAsBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dkc2_modified.sfc';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Export ROM
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          <p>ROM loaded successfully</p>
          <p className="mt-1">Size: 4 MB (HiROM)</p>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <LevelEditor romFile={romFile} levelId={selectedLevel} />
      </div>
    </div>
  );
}

export default App;
