import React from 'react';
import ReportForm from '../components/ReportForm';

const ReportPage = () => {
  return (
    <div className="min-h-screen py-4">
      <div className="container mx-auto px-4">
        <div className="bg-gray-200 rounded-lg p-4 md:p-6 shadow-lg">
          <ReportForm />
        </div>
      </div>
    </div>
  );
};

export default ReportPage;