import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportDetailsCard from '../../../src/components/ReportDetailsCard';
import { Report, UploadedFile } from '../../../src/types';

describe('ReportDetailsCard', () => {
  const mockReport: Report = {
    id: 'test-id-123',
    schoolName: 'ABC Driving School',
    location: 'Newark, NJ',
    violationDescription: 'Operating without proper license',
    phoneNumber: '+1-555-123-4567',
    websiteUrl: 'https://www.abc-driving.com',
    uploadedFiles: [
      {
        id: 'file-1',
        name: 'license-photo.jpg',
        type: 'image/jpeg',
        size: 1024000,
        url: 'https://example.com/license-photo.jpg',
        thumbnailUrl: 'https://example.com/thumbnails/license-photo.jpg'
      },
      {
        id: 'file-2',
        name: 'certificate.pdf',
        type: 'application/pdf',
        size: 512000,
        url: 'https://example.com/certificate.pdf'
      }
    ],
    socialMediaLinks: ['https://facebook.com/abc-driving'],
    additionalInfo: 'Additional information',
    status: 'Added' as const,
    lastReported: '2024-01-15T10:30:00.000Z',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
    reporterIp: '192.168.1.1',
    adminNotes: 'Initial review completed',
    mvcReferenceNumber: 'MVC-2024-001',
    reporterName: 'John Doe',
    reporterPhone: '+1-555-987-6543',
    reporterSchool: 'XYZ High School',
    reporterEmail: 'john.doe@example.com'
  };

  test('renders report details card with all required fields', () => {
    render(<ReportDetailsCard report={mockReport} />);
    
    // Check if the component renders
    expect(screen.getByTestId('report-details-card')).toBeInTheDocument();
    
    // Check that school name is displayed prominently (bolded and centered)
    const schoolNameElements = screen.getAllByText('ABC Driving School');
    expect(schoolNameElements.length).toBe(1); // Only in table layout for popup
    
    // Verify school name styling (bold and centered) - check the first element
    const schoolNameElement = schoolNameElements[0];
    const schoolNameContainer = schoolNameElement.closest('td, div');
    expect(schoolNameContainer).toBeTruthy();
    
    // Check that at least one school name spans both columns in the table layout
    const tableCell = schoolNameElement.closest('td');
    if (tableCell) {
      expect(tableCell).toHaveAttribute('colspan', '2');
    }
    
    // Check that school name has bold styling
    expect(schoolNameElement).toHaveClass('font-bold');
    
    // Check if all required fields are displayed
    expect(screen.getAllByText('Operating without proper license').length).toBeGreaterThan(0);
    
    // Check status (there are multiple "Added" texts, so check for at least one)
    expect(screen.getAllByText('Added').length).toBeGreaterThan(0);
    
    // Check dates (there are multiple "01/15/2024" texts, so check for at least one)
    expect(screen.getAllByText('01/15/2024').length).toBeGreaterThan(0);
    
    // Check for required fields in table (now using getAllByText since they appear in both layouts)
    expect(screen.getAllByText('Newark, NJ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+1-555-123-4567').length).toBeGreaterThan(0);
    expect(screen.getAllByText('https://www.abc-driving.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('license-photo.jpg').length).toBeGreaterThan(0);
  });

  test('handles missing optional fields gracefully', () => {
    const minimalReport: Report = {
      id: 'test-id-456',
      schoolName: 'Minimal Driving School',
      status: 'Added' as const,
      lastReported: '2024-01-20T14:00:00.000Z',
      createdAt: '2024-01-20T14:00:00.000Z',
      updatedAt: '2024-01-20T14:00:00.000Z'
    };

    render(<ReportDetailsCard report={minimalReport} />);
    
    // Check that missing fields show "N/A" or "No files uploaded"
    const naElements = screen.getAllByText('N/A');
    const noFilesElements = screen.getAllByText('No files uploaded');
    expect(naElements.length + noFilesElements.length).toBeGreaterThan(0);
  });

  test('displays "No files uploaded" when no files are present', () => {
    const reportWithoutFiles: Report = {
      ...mockReport,
      uploadedFiles: []
    };

    render(<ReportDetailsCard report={reportWithoutFiles} />);
    
    // Now there will be 2 "No files uploaded" elements (one in table, one in grid)
    const noFilesElements = screen.getAllByText('No files uploaded');
    expect(noFilesElements.length).toBeGreaterThan(0);
  });

  test('formats dates correctly in MM/DD/YYYY format', () => {
    render(<ReportDetailsCard report={mockReport} />);
    
    // Check that all dates are formatted correctly
    const dateElements = screen.getAllByText('01/15/2024');
    expect(dateElements.length).toBeGreaterThan(0);
  });

  test('makes website URL clickable', () => {
    render(<ReportDetailsCard report={mockReport} />);
    
    // Now there are 2 website links (one in table, one in grid)
    const websiteLinks = screen.getAllByRole('link', { name: 'https://www.abc-driving.com' });
    expect(websiteLinks.length).toBeGreaterThan(0);
    
    // Check that at least one link has the correct attributes
    const firstLink = websiteLinks[0];
    expect(firstLink).toHaveAttribute('href', 'https://www.abc-driving.com');
    expect(firstLink).toHaveAttribute('target', '_blank');
  });

  test('applies correct CSS classes and styling', () => {
    render(<ReportDetailsCard report={mockReport} />);
    
    // Check for main container
    expect(screen.getByTestId('report-details-card')).toHaveClass('w-full');
    
    // Check for table container (compact layout for popup)
    expect(screen.getByTestId('report-details-table-container')).toHaveClass('table-container');

    // Check for table
    expect(screen.getByTestId('report-details-table')).toHaveClass('w-full', 'border-collapse', 'table-fixed');
  });

  test('renders compact table layout for popup', () => {
    render(<ReportDetailsCard report={mockReport} />);

    // Check that only table layout exists for popup usage
    expect(screen.getByTestId('report-details-table-container')).toBeInTheDocument();

    // Check that grid layout does not exist (removed for popup usage)
    expect(screen.queryByTestId('report-details-grid-container')).not.toBeInTheDocument();
  });

  test('handles long violation descriptions by putting them on their own row', () => {
    const longDescriptionReport: Report = {
      ...mockReport,
      violationDescription: 'This is a very long violation description that exceeds fifty characters and should be displayed on its own dedicated row for better readability and user experience when viewing the report details in the admin interface.'
    };

    render(<ReportDetailsCard report={longDescriptionReport} />);
    
    // Check that reason row exists (only in table layout for popup)
    expect(screen.getAllByTestId('reason-row').length).toBe(1); // Only in table layout

    // Check that the long description is displayed in table layout
    expect(screen.getAllByText(/This is a very long violation description that exceeds fifty characters/i).length).toBe(1); // Only in table layout
    
    // For popup usage, reason is handled in table layout only
  });

  test('puts Reason on separate row when description exceeds 50 characters', () => {
    const reportWith50CharDescription: Report = {
      ...mockReport,
      violationDescription: 'Short description for testing purposes'
    }; // This is 35 characters

    const reportWith51CharDescription: Report = {
      ...mockReport,
      violationDescription: 'This is a longer description that exceeds fifty characters'
    }; // This is 58 characters

    // Test with short description (should NOT get own row based on length check)
    render(<ReportDetailsCard report={reportWith50CharDescription} />);
    expect(screen.queryAllByTestId('reason-row').length).toBe(0); // Should not have reason row
    
    // Test with long description (should get own row)
    render(<ReportDetailsCard report={reportWith51CharDescription} />);
    expect(screen.getAllByTestId('reason-row').length).toBeGreaterThan(0);
  });
});