import React from 'react';
import ReportForm from '../components/ReportForm';

const ReportPage = () => {
  return (
    <div className="min-h-screen" data-testid="report-page-root">
      <div className="w-full max-w-7xl mx-auto px-4 py-2" data-testid="report-page-container">
        <div className="bg-gray-200 rounded-lg p-2 md:p-3 shadow-lg" data-testid="report-form-container">
          <ReportForm />
        </div>
      </div>
    </div>
  );
};

export default ReportPage;