import React, { useState, useEffect } from 'react';

const TestImagePage: React.FC = () => {
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available files on component mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/files');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success && data.data.files) {
          setAvailableFiles(data.data.files);
          // Auto-select the first image file if available
          const firstImage = data.data.files.find((file: any) => file.type.startsWith('image/'));
          if (firstImage) {
            setSelectedFile({
              ...firstImage,
              url: `http://localhost:5000/api/files/${firstImage.id}/download`
            });
          }
        } else {
          setError('No files found in the system');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // Alternative URLs to test (will be populated when a file is selected)
  const alternativeUrls = selectedFile ? {
    directDownload: `https://drive.google.com/uc?export=download&id=${selectedFile.driveFileId || 'unknown'}`,
    proxyUrl: `http://localhost:5000/api/files/${selectedFile.id}/download`,
    viewLink: selectedFile.driveUrl ? selectedFile.driveUrl.replace('uc?export=download&id=', 'file/d/').replace('&export=download', '/view?usp=drive_link') : '',
    thumbnailLink: `https://drive.google.com/thumbnail?id=${selectedFile.driveFileId || 'unknown'}`
  } : {};

  // Function to test different URL formats
  const testUrl = async (testName: string, url: string) => {
    const resultDiv = document.getElementById('url-test-result');
    if (!resultDiv) return;

    resultDiv.innerHTML = `<div class="text-blue-600">⏳ Testing ${testName}...</div>`;

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors'
      });

      resultDiv.innerHTML = `
        <div class="text-green-600 font-medium">✅ ${testName} test completed</div>
        <div class="text-sm mt-2">
          <div><strong>URL:</strong> ${url}</div>
          <div><strong>Status:</strong> ${response.status || 'Unknown (no-cors mode)'}</div>
          <div><strong>Success:</strong> Request completed without throwing</div>
        </div>
      `;
    } catch (error) {
      resultDiv.innerHTML = `
        <div class="text-red-600 font-medium">❌ ${testName} test failed</div>
        <div class="text-sm mt-2">
          <div><strong>URL:</strong> ${url}</div>
          <div><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</div>
          <div class="mt-2 text-gray-600">
            This URL format is not accessible from web browsers.
          </div>
        </div>
      `;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Image Loading Test</h1>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading available files...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Image Loading Test</h1>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-8">
              <div className="text-red-600 font-medium">Error: {error}</div>
              <p className="mt-2 text-gray-600">Make sure the server is running and files exist in the system.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no file is selected, show file selector
  if (!selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Image Loading Test</h1>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Files</h2>
            {availableFiles.length === 0 ? (
              <p className="text-gray-600">No files found in the system.</p>
            ) : (
              <div className="space-y-2">
                {availableFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile({
                      ...file,
                      url: `http://localhost:5000/api/files/${file.id}/download`
                    })}
                    className="w-full text-left p-3 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-gray-600">{file.type} • {file.size} bytes</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const imageFile = selectedFile;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Image Loading Test</h1>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Image Display</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File Information:</label>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>ID: {imageFile.id}</div>
                <div>Name: {imageFile.name}</div>
                <div>Type: {imageFile.type}</div>
                <div>Size: {imageFile.size} bytes</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Image URL:</label>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono break-all">
                {imageFile.url}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL:</label>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono break-all">
                {imageFile.thumbnailUrl}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Image Display Test</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image:</label>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <img
                      src={imageFile.url}
                      alt={imageFile.name}
                      className="max-w-full max-h-96 object-contain mx-auto"
                      onLoad={() => {
                        const parent = document.querySelector('.main-image-container');
                        if (parent) {
                          const statusDiv = parent.querySelector('.load-status');
                          if (statusDiv) {
                            statusDiv.textContent = '✅ Image loaded successfully';
                            statusDiv.className = 'load-status text-green-600 text-center py-2 font-medium';
                          }
                        }
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.error-message')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'error-message text-red-600 text-center py-4';
                          errorDiv.innerHTML = `
                            <div class="font-medium">❌ Failed to load main image</div>
                            <div class="text-sm mt-2 text-gray-600">
                              Possible causes:
                              <ul class="list-disc list-inside mt-1 text-left">
                                <li>File permissions not set to "Anyone with link can view"</li>
                                <li>Google Drive sharing settings incorrect</li>
                                <li>File was deleted or moved</li>
                                <li>CORS policy blocking the request</li>
                                <li>Network connectivity issues</li>
                              </ul>
                            </div>
                          `;
                          parent.appendChild(errorDiv);
                        }
                      }}
                    />
                    <div className="main-image-container">
                      <div className="load-status text-blue-600 text-center py-2 font-medium">
                        ⏳ Attempting to load image...
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail:</label>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <img
                      src={imageFile.thumbnailUrl}
                      alt={`Thumbnail of ${imageFile.name}`}
                      className="w-32 h-32 object-cover mx-auto"
                      onLoad={() => {
                        const parent = document.querySelector('.thumbnail-container');
                        if (parent) {
                          const statusDiv = parent.querySelector('.load-status');
                          if (statusDiv) {
                            statusDiv.textContent = '✅ Thumbnail loaded successfully';
                            statusDiv.className = 'load-status text-green-600 text-center py-2 font-medium';
                          }
                        }
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.error-message')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'error-message text-red-600 text-center py-4';
                          errorDiv.innerHTML = `
                            <div class="font-medium">❌ Failed to load thumbnail</div>
                            <div class="text-sm mt-2 text-gray-600">
                              Thumbnail URLs may have different permissions or may expire.
                            </div>
                          `;
                          parent.appendChild(errorDiv);
                        }
                      }}
                    />
                    <div className="thumbnail-container">
                      <div className="load-status text-blue-600 text-center py-2 font-medium">
                        ⏳ Attempting to load thumbnail...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Direct Links</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <a
                    href={imageFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-center text-sm"
                  >
                    Current URL
                  </a>
                  <a
                    href={alternativeUrls.directDownload}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-center text-sm"
                  >
                    Direct Download
                  </a>
                  <a
                    href={alternativeUrls.viewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-400 text-white px-3 py-2 rounded hover:bg-blue-500 text-center text-sm"
                  >
                    View Link
                  </a>
                </div>
                <div className="mt-2">
                  <a
                    href={imageFile.thumbnailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Open Thumbnail in New Tab
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">URL Format Testing</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Test Different URL Formats:</h4>
                    <div className="space-y-2">
                      <button
                        onClick={async () => testUrl('current-url', imageFile.url)}
                        className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Test Current URL
                      </button>
                      <button
                        onClick={async () => alternativeUrls.directDownload && testUrl('direct-download', alternativeUrls.directDownload)}
                        className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!alternativeUrls.directDownload}
                      >
                        Test Direct Download
                      </button>
                      <button
                        onClick={async () => alternativeUrls.thumbnailLink && testUrl('thumbnail-api', alternativeUrls.thumbnailLink)}
                        className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!alternativeUrls.thumbnailLink}
                      >
                        Test Thumbnail API
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Alternative Image Display:</h4>
                    <div className="space-y-2">
                      <img
                        src={alternativeUrls.directDownload}
                        alt="Direct download test"
                        className="w-32 h-32 object-cover border border-gray-300 rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const container = target.parentElement;
                          if (container && !container.querySelector('.alt-error')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'alt-error text-red-600 text-sm';
                            errorDiv.textContent = 'Direct download failed';
                            container.appendChild(errorDiv);
                          }
                        }}
                        onLoad={() => {
                          const container = document.querySelector('.alt-image-container');
                          if (container) {
                            const successDiv = container.querySelector('.alt-success') as HTMLElement;
                            if (successDiv) {
                              successDiv.style.display = 'block';
                            }
                          }
                        }}
                      />
                      <div className="alt-image-container">
                        <div className="alt-success text-green-600 text-sm" style={{ display: 'none' }}>
                          ✅ Alternative URL works!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div id="url-test-result" className="bg-gray-50 p-4 rounded text-sm">
                  Click a test button above to check different URL formats.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestImagePage;