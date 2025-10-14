import React, { useState } from 'react';
import { useColorScheme } from '../contexts/ColorSchemeContext';
import { ColorSchemeUploader } from './ColorSchemeUploader';
import { generateAllGradients, createGradient } from '../utils/gradientUtils';

interface ColorSchemeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ColorSchemeManager({ isOpen, onClose }: ColorSchemeManagerProps) {
  const {
    currentColorScheme,
    availableColorSchemes,
    applyColorScheme,
    deleteColorScheme,
    resetToDefault,
  } = useColorScheme();

  const [activeTab, setActiveTab] = useState<'manage' | 'upload' | 'preview'>('manage');
  const [previewScheme, setPreviewScheme] = useState(currentColorScheme);

  if (!isOpen) return null;

  const handleSchemeSelect = (scheme: any) => {
    setPreviewScheme(scheme);
  };

  const handleSchemeApply = (scheme: any) => {
    applyColorScheme(scheme);
    setPreviewScheme(scheme);
  };

  const handleSchemeDelete = (schemeId: string) => {
    if (availableColorSchemes.length > 1) {
      deleteColorScheme(schemeId);
    }
  };

  const gradients = previewScheme ? generateAllGradients(previewScheme) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Color Scheme Manager
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'manage'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Manage Schemes
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'upload'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Upload New
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'preview'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Available Color Schemes
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableColorSchemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        currentColorScheme?.id === scheme.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleSchemeSelect(scheme)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {scheme.name}
                        </h4>
                        {currentColorScheme?.id === scheme.id && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Color palette preview */}
                      <div className="flex space-x-1 mb-3">
                        {Object.values(scheme.colors).map((color, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600"
                            style={{ backgroundColor: color.hex }}
                            title={`${color.hex} - ${Object.keys(scheme.colors)[index]}`}
                          />
                        ))}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSchemeApply(scheme);
                          }}
                          className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Apply
                        </button>
                        {scheme.id !== 'default-dull-orange' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSchemeDelete(scheme.id);
                            }}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={resetToDefault}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Upload New Color Scheme
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Upload a .scss file containing color definitions in Coolors format.
                  The file should include color variables and gradient definitions.
                </p>
                <ColorSchemeUploader onUploadSuccess={onClose} />
              </div>
            </div>
          )}

          {activeTab === 'preview' && previewScheme && gradients && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Preview: {previewScheme.name}
                </h3>

                {/* Color palette */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Color Palette
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(previewScheme.colors).map(([name, color]) => (
                      <div key={name} className="text-center">
                        <div
                          className="w-full h-16 rounded-lg border-2 border-gray-200 dark:border-gray-600 mb-2"
                          style={{ backgroundColor: color.hex }}
                        />
                        <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                          {name.replace('-', ' ')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {color.hex}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradient previews */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Gradient Presets
                  </h4>

                  <div className="grid gap-4 md:grid-cols-2">
                    {gradients.presets.map((preset, index) => (
                      <div key={index} className="space-y-2">
                        <div
                          className="h-20 rounded-lg border border-gray-200 dark:border-gray-600"
                          style={{ background: preset.gradient }}
                        />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {preset.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {preset.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Animation examples */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Animation Examples
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div
                      className="h-20 rounded-lg border border-gray-200 dark:border-gray-600 animate-gradient"
                      style={{
                        background: createGradient(previewScheme, {
                          direction: 'linear',
                          angle: 45,
                          colors: Object.values(previewScheme.colors).map(c => c.hex).filter(Boolean)
                        })
                      }}
                    />
                    <div
                      className="h-20 rounded-lg border border-gray-200 dark:border-gray-600 animate-gradient-shift"
                      style={{
                        background: createGradient(previewScheme, {
                          direction: 'linear',
                          angle: 90,
                          colors: Object.values(previewScheme.colors).map(c => c.hex).filter(Boolean)
                        })
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}