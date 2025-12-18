/**
 * ROM File Uploader Component
 */

import { useState } from 'react';
import { CartFile } from '@/core/rom-file';

interface RomUploaderProps {
  onRomLoaded: (romFile: CartFile) => void;
}

export const RomUploader: React.FC<RomUploaderProps> = ({ onRomLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const romFile = await CartFile.fromFile(file);

      if (!romFile.isValid()) {
        throw new Error('Invalid ROM file');
      }

      onRomLoaded(romFile);
    } catch (err) {
      console.error('Failed to load ROM:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ROM file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          DKC2 Web Level Editor
        </h1>
        <p className="text-gray-400 mb-6 text-center">
          Load a Donkey Kong Country 2 ROM file to begin editing
        </p>

        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition">
          <input
            type="file"
            accept=".sfc,.smc"
            onChange={handleFileSelect}
            className="hidden"
            id="rom-upload"
            disabled={loading}
          />
          <label
            htmlFor="rom-upload"
            className="cursor-pointer block"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-400">
              {loading ? (
                <span>Loading ROM...</span>
              ) : (
                <>
                  <span className="text-blue-400 hover:text-blue-300">Click to upload</span>
                  {' '}or drag and drop
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              SNES ROM file (.sfc, .smc)
              <br />
              Supports both headerless and headered formats
            </p>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded text-red-200 text-sm">
            <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
            <details className="mt-2 text-xs text-gray-300">
              <summary className="cursor-pointer hover:text-white">
                Check browser console for detailed logs
              </summary>
              <p className="mt-2">
                Open your browser's developer console (F12) to see detailed
                validation logs and debug information.
              </p>
            </details>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>This editor runs entirely in your browser.</p>
          <p>No data is uploaded to any server.</p>
        </div>
      </div>

      <div className="mt-8 text-gray-500 text-sm text-center">
        <p>
          Based on the original DKC2 Editor by Francis Renaud (2008)
        </p>
        <p className="mt-2">
          Web version created using modern web technologies
        </p>
      </div>
    </div>
  );
};
