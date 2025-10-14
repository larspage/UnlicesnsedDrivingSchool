import React, { useCallback, useState } from 'react';
import { useColorScheme } from '../contexts/ColorSchemeContext';

interface ColorSchemeUploaderProps {
  onUploadSuccess?: () => void;
  className?: string;
}

export function ColorSchemeUploader({ onUploadSuccess, className = '' }: ColorSchemeUploaderProps) {
  const { loadColorSchemeFromFile, isLoading, error } = useColorScheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setUploadError(null);
      await loadColorSchemeFromFile(file);
      onUploadSuccess?.();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload color scheme');
    }
  }, [loadColorSchemeFromFile, onUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const scssFile = files.find(file => file.name.endsWith('.scss'));

    if (scssFile) {
      handleFileUpload(scssFile);
    } else {
      setUploadError('Please upload a valid .scss color scheme file');
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <div className={`color-scheme-uploader ${className}`}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".scss"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              className="w-full h-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isLoading ? 'Uploading color scheme...' : 'Drop your color scheme file here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              or click to browse for .scss files
            </p>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500">
            <p>Supported format: Coolors SCSS color scheme files</p>
            <p>Example: dullorange.scss, earthtones.scss</p>
          </div>
        </div>

        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 border-blue-500 rounded-lg flex items-center justify-center">
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Drop your color scheme file here
            </p>
          </div>
        )}
      </div>

      {(uploadError || error) && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">
            {uploadError || error}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Processing color scheme...
          </span>
        </div>
      )}
    </div>
  );
}