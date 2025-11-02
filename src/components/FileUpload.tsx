import React, { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { validateFileForUpload, apiClient, UploadedFile } from '../services/api';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  onUploadComplete?: (uploadedFiles: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  reportId?: string;
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

interface FileWithPreview extends File {
  preview?: string;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  onUploadComplete,
  onUploadError,
  reportId,
  maxFiles = 10,
  className = '',
  disabled = false
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithPreview[] = Array.from(selectedFiles);
    const validatedFiles: FileWithPreview[] = [];

    // Validate each file
    for (const file of newFiles) {
      const validation = validateFileForUpload(file);
      if (validation.isValid) {
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fileWithPreview = file as FileWithPreview;
            fileWithPreview.preview = e.target?.result as string;
            updateFiles();
          };
          reader.readAsDataURL(file);
        }
        validatedFiles.push(file);
      } else {
        const invalidFile = file as FileWithPreview;
        invalidFile.error = validation.error;
        validatedFiles.push(invalidFile);
      }
    }

    // Combine with existing valid files
    const currentValidFiles = files.filter(f => !f.error);
    const allValidFiles = [...currentValidFiles, ...validatedFiles.filter(f => !f.error)];

    // Limit to maxFiles
    const limitedFiles = allValidFiles.slice(0, maxFiles);

    // Add invalid files for display
    const invalidFiles = validatedFiles.filter(f => f.error);
    const finalFiles = [...limitedFiles, ...invalidFiles];

    setFiles(finalFiles);
    onFilesChange(limitedFiles);
  };

  const updateFiles = () => {
    setFiles(prev => [...prev]);
  };

  const uploadFiles = async () => {
    if (!reportId) {
      onUploadError?.('Report ID is required for file upload');
      return;
    }

    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) {
      onUploadError?.('No valid files to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      const response = await apiClient.uploadFiles(validFiles, reportId);

      if (response.success && response.data) {
        onUploadComplete?.(response.data.files);
        // Remove successfully uploaded files from the local state
        const remainingFiles = files.filter(f => f.error); // Keep only files with errors
        setFiles(remainingFiles);
        onFilesChange(remainingFiles.filter(f => !f.error));
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    flushSync(() => {
      setFiles(newFiles);
    });
    const validFiles = newFiles.filter(f => !f.error);
    onFilesChange(validFiles);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileWithPreview) => {
    if (file.error) return '❌';
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type === 'application/pdf') return '📄';
    return '📎';
  };

  const validFilesCount = files.filter(f => !f.error).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : disabled || isUploading
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={!disabled && !isUploading ? handleDragOver : undefined}
        onDragLeave={!disabled && !isUploading ? handleDragLeave : undefined}
        onDrop={!disabled && !isUploading ? handleDrop : undefined}
      >
        <div className="space-y-4">
          <div className="text-4xl">
            {isUploading ? '⏳' : '📁'}
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isUploading ? (
                'Uploading files...'
              ) : (
                <>
                  Drop files here or{' '}
                  <button
                    type="button"
                    onClick={openFileDialog}
                    disabled={disabled || isUploading}
                    className="text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400"
                  >
                    browse
                  </button>
                </>
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports images, videos, and PDFs (max 10MB each)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {validFilesCount}/{maxFiles} files selected
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,application/pdf"
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
      </div>

      {/* Upload Button */}
      {validFilesCount > 0 && !isUploading && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={uploadFiles}
            disabled={!reportId || disabled}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Upload {validFilesCount} File{validFilesCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Selected Files</h4>
            {isUploading && (
              <span className="text-sm text-blue-600">Uploading...</span>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  file.error ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file)}</span>
                  <div className="flex-1 min-w-0">
                    {file.preview ? (
                      <div className="flex items-center space-x-3">
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                          {/* Upload progress indicator */}
                          {isUploading && !file.error && (
                            <div className="mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress[file.name] || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className={`text-sm font-medium truncate ${
                          file.error ? 'text-red-900' : 'text-gray-900'
                        }`}>
                          {file.name}
                        </p>
                        <p className={`text-xs ${
                          file.error ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {file.error || formatFileSize(file.size)}
                        </p>
                        {/* Upload progress indicator for non-preview files */}
                        {isUploading && !file.error && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[file.name] || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!file.error && !isUploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={disabled}
                    className="ml-2 text-red-500 hover:text-red-700 p-1 disabled:text-gray-300"
                    title="Remove file"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <ul className="text-xs text-gray-500 space-y-0 list-disc list-inside">
        <li className="mb-1">Maximum {maxFiles} files allowed</li>
        <li className="mb-1">Each file can be up to 10MB</li>
        <li className="mb-1">Supported formats: JPEG, PNG, GIF, WebP, MP4, AVI, MOV, PDF</li>
      </ul>
    </div>
  );
};

export default FileUpload;