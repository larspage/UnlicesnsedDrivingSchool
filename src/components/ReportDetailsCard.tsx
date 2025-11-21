import React from 'react';
import { Report } from '../types';

interface ReportDetailsCardProps {
  report: Report;
}

const ReportDetailsCard: React.FC<ReportDetailsCardProps> = ({ report }) => {
  // Format date to MM/DD/YYYY
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get first uploaded file or show placeholder
  const getFirstFile = (): string => {
    if (report.uploadedFiles && report.uploadedFiles.length > 0) {
      return report.uploadedFiles[0].name;
    }
    return 'No files uploaded';
  };

  // Check if violation description should be on its own row (long descriptions)
  const hasLongDescription = (report.violationDescription || '').length > 50;
  const reason = report.violationDescription || 'N/A';
  
  // Field data for grid layout (excluding Reason which gets its own row)
  const fields = [
    { label: 'Status', value: report.status },
    { label: 'Location', value: report.location || 'N/A' },
    { label: 'Phone', value: report.phoneNumber || 'N/A' },
    {
      label: 'Website',
      value: report.websiteUrl ? (
        <a
          href={report.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-words"
        >
          {report.websiteUrl}
        </a>
      ) : 'N/A'
    },
    { label: 'Files', value: getFirstFile() },
    { label: 'Added', value: formatDate(report.updatedAt || report.createdAt) },
    { label: 'Last Reported', value: formatDate(report.lastReported) },
    { label: 'Created', value: formatDate(report.createdAt) }
  ];

  // Only include Reason in fields if it doesn't get its own row (short descriptions)
  const fieldsForGrid = hasLongDescription ? fields : [...fields, { label: 'Reason', value: reason }];

  // For popup usage, always use compact 2-column table layout
  return (
    <div className="w-full" data-testid="report-details-card">
      <div className="bg-white" data-testid="report-details-container">
        {/* Always use compact table layout for popup */}
        <div className="table-container" data-testid="report-details-table-container">
          <table className="w-full border-collapse table-fixed" data-testid="report-details-table">
            <colgroup data-testid="report-details-colgroup">
              <col className="w-[35%]" data-testid="label-col" />
              <col className="w-[65%]" data-testid="value-col" />
            </colgroup>
            <tbody>
              {/* School Name - Bold and Centered */}
              <tr>
                <td colSpan={2} className="py-2 px-2 text-center">
                  <span className="text-sm font-bold text-gray-900 break-words">
                    {report.schoolName || 'N/A'}
                  </span>
                </td>
              </tr>
              
              {/* Reason: separate row ONLY for long descriptions */}
              {hasLongDescription && (
                <tr data-testid="reason-row">
                  <td className="py-1 px-2 align-top">
                    <span className="block text-xs font-medium text-gray-600">Reason</span>
                  </td>
                  <td className="py-1 px-2">
                    <span className="text-xs text-gray-900 break-words leading-tight">
                      {reason}
                    </span>
                  </td>
                </tr>
              )}
              
              {/* Other fields (including Reason for short descriptions) */}
              {fieldsForGrid.filter(field => field.label !== 'School Name').map((field, index) => (
                <tr key={`field-${index}`}>
                  <td className="py-1 px-2 align-top">
                    <span className="block text-xs font-medium text-gray-600 leading-tight">{field.label}</span>
                  </td>
                  <td className="py-1 px-2">
                    <span className="text-xs text-gray-900 break-words leading-tight">
                      {typeof field.value === 'string' ? field.value : field.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsCard;