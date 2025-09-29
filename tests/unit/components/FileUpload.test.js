/**
 * FileUpload Component Tests for NJDSC School Compliance Portal
 *
 * Tests for file upload UI component functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../../../src/components/FileUpload';
import * as api from '../../../src/services/api';

// Mock the API service
jest.mock('../../../src/services/api');

describe('FileUpload Component', () => {
  const mockOnFilesChange = jest.fn();
  const mockOnUploadComplete = jest.fn();
  const mockOnUploadError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render upload area', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      expect(screen.getByText('Drop files here or')).toBeInTheDocument();
      expect(screen.getByText('browse')).toBeInTheDocument();
      expect(screen.getByText('Supports images, videos, and PDFs (max 10MB each)')).toBeInTheDocument();
    });

    it('should show file count when files are selected', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      // Initially shows 0 files
      expect(screen.getByText('0/10 files selected')).toBeInTheDocument();
    });

    it('should disable upload when no reportId provided', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          // No reportId provided
        />
      );

      // Upload button should not be present when no reportId
      expect(screen.queryByText(/Upload \d+ File/)).not.toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file selection via browse button', async () => {
      const user = userEvent.setup();
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /browse/i });

      // Click browse button (this would normally open file dialog)
      // In real implementation, this would trigger file input click
      expect(input).toBeInTheDocument();
    });

    it('should validate files on selection', async () => {
      // Mock validateFileForUpload to return valid
      api.validateFileForUpload.mockReturnValue({ isValid: true });

      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      // Create a mock file input
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;

      // Simulate file selection
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      // Trigger change event
      fireEvent.change(input);

      expect(api.validateFileForUpload).toHaveBeenCalledWith(file);
    });
  });

  describe('File Upload', () => {
    it('should upload files successfully', async () => {
      const user = userEvent.setup();

      // Mock successful upload
      api.apiClient.uploadFiles = jest.fn().mockResolvedValue({
        success: true,
        data: {
          files: [
            {
              id: 'file_abc123',
              name: 'test.jpg',
              type: 'image/jpeg',
              url: 'https://example.com/file1'
            }
          ],
          totalUploaded: 1,
          totalRequested: 1
        }
      });

      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          onUploadComplete={mockOnUploadComplete}
          reportId="rep_abc123"
        />
      );

      // Mock file selection first
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      api.validateFileForUpload.mockReturnValue({ isValid: true });

      // Simulate file selection
      const input = document.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Wait for upload button to appear
      await waitFor(() => {
        expect(screen.getByText(/Upload 1 File/)).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText(/Upload 1 File/);
      await user.click(uploadButton);

      // Wait for upload to complete
      await waitFor(() => {
        expect(api.apiClient.uploadFiles).toHaveBeenCalledWith([mockFile], 'rep_abc123');
        expect(mockOnUploadComplete).toHaveBeenCalled();
      });
    });

    it('should handle upload errors', async () => {
      const user = userEvent.setup();

      // Mock failed upload
      api.apiClient.uploadFiles = jest.fn().mockRejectedValue(new Error('Upload failed'));

      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          onUploadError={mockOnUploadError}
          reportId="rep_abc123"
        />
      );

      // Mock file selection
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      api.validateFileForUpload.mockReturnValue({ isValid: true });

      const input = document.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Wait for upload button
      await waitFor(() => {
        expect(screen.getByText(/Upload 1 File/)).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText(/Upload 1 File/);
      await user.click(uploadButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith('Upload failed');
      });
    });

    it('should show uploading state during upload', async () => {
      const user = userEvent.setup();

      // Mock slow upload
      api.apiClient.uploadFiles = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      // Mock file selection
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      api.validateFileForUpload.mockReturnValue({ isValid: true });

      const input = document.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Wait for upload button
      await waitFor(() => {
        expect(screen.getByText(/Upload 1 File/)).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText(/Upload 1 File/);
      await user.click(uploadButton);

      // Should show uploading state
      expect(screen.getByText('Uploading files...')).toBeInTheDocument();
      expect(screen.queryByText(/Upload 1 File/)).not.toBeInTheDocument();
    });
  });

  describe('File Management', () => {
    it('should remove files when remove button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      // Mock file selection
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      api.validateFileForUpload.mockReturnValue({ isValid: true });

      const input = document.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Wait for file to appear in list
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Click remove button (✕)
      const removeButton = screen.getByText('✕');
      await user.click(removeButton);

      // File should be removed
      expect(mockOnFilesChange).toHaveBeenCalledWith([]);
    });

    it('should display file information correctly', async () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      // Mock file selection
      const mockFile = new File(['x'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' });
      api.validateFileForUpload.mockReturnValue({ isValid: true });

      const input = document.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Wait for file display
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
        expect(screen.getByText('1 KB')).toBeInTheDocument();
        expect(screen.getByText('🖼️')).toBeInTheDocument(); // Image icon
      });
    });

    it('should show error for invalid files', async () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      // Mock invalid file
      const mockFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      api.validateFileForUpload.mockReturnValue({
        isValid: false,
        error: 'File type application/x-msdownload is not supported'
      });

      const input = document.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Wait for error display
      await waitFor(() => {
        expect(screen.getByText('test.exe')).toBeInTheDocument();
        expect(screen.getByText('File type application/x-msdownload is not supported')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over events', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      const dropZone = screen.getByText('Drop files here or').closest('div');

      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');

      fireEvent.dragLeave(dropZone);
      expect(dropZone).toHaveClass('border-gray-300');
    });

    it('should handle file drop', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      const dropZone = screen.getByText('Drop files here or').closest('div');
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      api.validateFileForUpload.mockReturnValue({ isValid: true });

      const dropEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          files: [mockFile]
        }
      };

      fireEvent.drop(dropZone, dropEvent);

      expect(api.validateFileForUpload).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
        />
      );

      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('multiple');
      expect(input).toHaveAttribute('accept', 'image/*,video/*,.pdf,application/pdf');
    });

    it('should disable component when disabled prop is true', () => {
      render(
        <FileUpload
          onFilesChange={mockOnFilesChange}
          reportId="rep_abc123"
          disabled={true}
        />
      );

      const browseButton = screen.getByText('browse');
      expect(browseButton).toBeDisabled();

      const input = document.querySelector('input[type="file"]');
      expect(input).toBeDisabled();
    });
  });
});