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

  return (
    <div className="w-full max-w-6xl mx-auto" data-testid="report-details-card">
      <div className="card bg-white" data-testid="report-details-container">
        {/* Small screens: 2-column table */}
        <div className="md:hidden table-container overflow-x-auto" data-testid="report-details-table-container">
          <table className="w-full border-collapse table-fixed" data-testid="report-details-table">
            <colgroup data-testid="report-details-colgroup">
              <col className="w-[30%]" data-testid="label-col" />
              <col className="w-[70%]" data-testid="value-col" />
            </colgroup>
            <tbody>
              {/* School Name - Bold and Centered */}
              <tr>
                <td colSpan={2} className="py-2 px-0 text-center">
                  <span className="text-sm font-bold text-gray-900 break-words">
                    {report.schoolName || 'N/A'}
                  </span>
                </td>
              </tr>
              
              {/* Reason: separate row ONLY for long descriptions */}
              {hasLongDescription && (
                <tr data-testid="reason-row">
                  <td className="py-1 pr-2 align-top">
                    <span className="block text-xs font-medium text-dim-gray">Reason</span>
                  </td>
                  <td className="py-1 pl-2">
                    <span className="text-xs text-gray-900 break-words">
                      {reason}
                    </span>
                  </td>
                </tr>
              )}
              
              {/* Other fields (including Reason for short descriptions) */}
              {fieldsForGrid.filter(field => field.label !== 'School Name').map((field, index) => (
                <tr key={`field-${index}`}>
                  <td className="py-1 pr-2 align-top">
                    <span className="block text-xs font-medium text-dim-gray">{field.label}</span>
                  </td>
                  <td className="py-1 pl-2">
                    <span className="text-xs text-gray-900 break-words">
                      {typeof field.value === 'string' ? field.value : field.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Medium+ screens: 3-column grid */}
        <div className="hidden md:block" data-testid="report-details-grid-container">
          <div className="space-y-1" data-testid="report-details-grid">
            {/* School Name - Bold and Centered */}
            <div className="py-2 text-center col-span-3">
              <span className="text-sm font-bold text-gray-900 break-words">
                {report.schoolName || 'N/A'}
              </span>
            </div>
            
            {/* Reason: separate row ONLY for long descriptions */}
            {hasLongDescription && (
              <div className="col-span-3 py-1" data-testid="reason-row">
                <div className="flex">
                  <span className="text-xs font-medium text-dim-gray mr-1 flex-shrink-0">Reason:</span>
                  <span className="text-xs text-gray-900 break-words flex-1">
                    {reason}
                  </span>
                </div>
              </div>
            )}
            
            {/* Other fields in 3-column grid (including Reason for short descriptions) */}
            <div className="grid grid-cols-3 gap-x-6 gap-y-1">
              {fieldsForGrid.filter(field => field.label !== 'School Name').map((field, index) => (
                <div key={index} className="py-0.5" data-testid={`field-${index}`}>
                  <div className="flex">
                    <span className="text-xs font-medium text-dim-gray mr-1 flex-shrink-0">{field.label}:</span>
                    <span className="text-xs text-gray-900 break-words flex-1">
                      {typeof field.value === 'string' ? field.value : field.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsCard;