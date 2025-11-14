import React from 'react';
import ReportDetailsCard from '../components/ReportDetailsCard';
import { Report } from '../types';

const ReportDetailsCardTestPage = () => {
  // Sample report data for testing
  const sampleReport: Report = {
    id: 'test-rep-123',
    schoolName: 'ABC Driving School',
    location: 'Newark, NJ 07102',
    violationDescription: 'Operating without proper MVC license. School claims to be licensed but cannot provide valid certificate when requested. Students observed receiving instruction from unlicensed instructor.',
    phoneNumber: '+1-555-123-4567',
    websiteUrl: 'https://www.abc-driving-school.com',
    uploadedFiles: [
      {
        id: 'file-1',
        name: 'license-photo-front.jpg',
        type: 'image/jpeg',
        size: 1024000,
        url: 'https://example.com/license-photo-front.jpg',
        thumbnailUrl: 'https://example.com/thumbnails/license-photo-front.jpg'
      },
      {
        id: 'file-2',
        name: 'instructor-certificate.pdf',
        type: 'application/pdf',
        size: 512000,
        url: 'https://example.com/instructor-certificate.pdf'
      }
    ],
    socialMediaLinks: ['https://facebook.com/abc-driving', 'https://instagram.com/abc_driving_nj'],
    additionalInfo: 'Additional witness reports available upon request',
    status: 'Added' as const,
    lastReported: '2024-01-15T10:30:00.000Z',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-16T14:22:00.000Z',
    reporterIp: '192.168.1.100',
    adminNotes: 'Initial review completed - requesting additional documentation',
    mvcReferenceNumber: 'MVC-2024-001234',
    reporterName: 'Jane Smith',
    reporterPhone: '+1-555-987-6543',
    reporterSchool: 'Rutgers University',
    reporterEmail: 'jane.smith@rutgers.edu'
  };

  // Sample report with minimal data
  const minimalReport: Report = {
    id: 'test-rep-456',
    schoolName: 'Quick Drive Training',
    status: 'Added' as const,
    lastReported: '2024-01-20T14:00:00.000Z',
    createdAt: '2024-01-20T14:00:00.000Z',
    updatedAt: '2024-01-20T14:00:00.000Z'
  };

  // Sample report with no files
  const noFilesReport: Report = {
    id: 'test-rep-789',
    schoolName: 'Basic Driving Lessons Inc',
    location: 'Trenton, NJ',
    violationDescription: 'Advertises services without proper licensing',
    phoneNumber: '+1-609-555-0123',
    status: 'Under Investigation' as const,
    lastReported: '2024-01-25T09:15:00.000Z',
    createdAt: '2024-01-25T09:15:00.000Z',
    updatedAt: '2024-01-26T11:30:00.000Z'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ReportDetailsCard Component Test Page
          </h1>
          <p className="text-gray-600">
            This page demonstrates the ReportDetailsCard component with various data scenarios.
          </p>
        </div>

        <div className="space-y-12">
          {/* Test Case 1: Complete Report */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Test Case 1: Complete Report Data
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Shows all fields populated with realistic data
            </p>
            <ReportDetailsCard report={sampleReport} />
          </div>

          {/* Test Case 2: Minimal Report */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Test Case 2: Minimal Report Data
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Shows how the component handles missing optional fields
            </p>
            <ReportDetailsCard report={minimalReport} />
          </div>

          {/* Test Case 3: No Files Report */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Test Case 3: Report with No Files
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Shows file handling when no files are uploaded
            </p>
            <ReportDetailsCard report={noFilesReport} />
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Component Features Demonstrated:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Read-only table layout with no borders</li>
            <li>✅ Minimal margins and spacing for page fitting</li>
            <li>✅ Automatic MM/DD/YYYY date formatting</li>
            <li>✅ Clickable website links with security attributes</li>
            <li>✅ "N/A" display for missing optional fields</li>
            <li>✅ Responsive design with overflow handling</li>
            <li>✅ First uploaded file display with fallback</li>
            <li>✅ Compact field labels (Reason, Phone, Website, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsCardTestPage;