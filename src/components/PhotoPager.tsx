import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../services/api';

interface PhotoPagerProps {
  files: UploadedFile[];
}

const PhotoPager: React.FC<PhotoPagerProps> = ({ files }) => {
  console.log('PhotoPager files:', files, typeof files, Array.isArray(files));

  // Filter for image files only
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  console.log('PhotoPager imageFiles:', imageFiles);

  // State for current image index, default to last (most current)
  const [currentIndex, setCurrentIndex] = useState(imageFiles.length - 1);

  // Reset to last image when files change
  useEffect(() => {
    setCurrentIndex(imageFiles.length - 1);
  }, [files]);

  // If no images, don't render anything
  if (imageFiles.length === 0) {
    return null;
  }

  const currentImage = imageFiles[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : imageFiles.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < imageFiles.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Supporting Photos ({imageFiles.length})
      </label>

      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        {/* Main Image */}
        <div className="aspect-w-16 aspect-h-9 bg-gray-200 flex items-center justify-center">
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="max-w-full max-h-96 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Create a fallback message
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.image-error')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error text-gray-500 text-center py-8';
                errorDiv.textContent = 'Image failed to load';
                parent.appendChild(errorDiv);
              }
            }}
          />
        </div>

        {/* Navigation Arrows - only show if more than 1 image */}
        {imageFiles.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {imageFiles.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {imageFiles.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {imageFiles.length > 1 && (
        <div className="mt-2 flex justify-center space-x-2 overflow-x-auto">
          {imageFiles.map((file, index) => (
            <button
              key={file.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                index === currentIndex ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              <img
                src={file.thumbnailUrl || file.url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.backgroundColor = '#f3f4f6';
                  target.style.display = 'flex';
                  target.style.alignItems = 'center';
                  target.style.justifyContent = 'center';
                  target.style.color = '#6b7280';
                  target.style.fontSize = '12px';
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5LjUgMTJDOS41IDE4IDkgMTcuMSAxNiAxN0MxNiAxNS45IDE2LjkgMTUgMTggMTVWNFoiIGZpbGw9IiM2QjcyODAiLz4KPHBhdGggZD0iTTEzIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5LjUgMTJDOS41IDE4IDkgMTcuMSAxNiAxN0MxNiAxNS45IDE2LjkgMTUgMTggMTVWNFoiIGZpbGw9IiM2QjcyODAiLz4KPC9zdmc+';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoPager;