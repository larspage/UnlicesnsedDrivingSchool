import React, { useState, useEffect } from 'react';
import { Report } from '../types';
import ReportSummaryCard from '../components/ReportSummaryCard';

const HomePage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        // Load reports from the public data file
        const response = await fetch('/data/reports.json');
        if (!response.ok) {
          throw new Error('Failed to load reports');
        }
        const data: Report[] = await response.json();
        
        // Sort by updatedAt (most recent first)
        const sortedReports = data.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        setReports(sortedReports);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="px-4 flex justify-center items-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 flex justify-center items-center min-h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-4">
          Welcome to NJDSC's Unlicensed Driving School Website
        </h1>
        <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Help protect students and the public by reporting potentially unlicensed driving schools in New Jersey.
          Your reports help New Jersey maintain safety standards.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
        <a
          href="/report"
          className="w-full sm:w-auto bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-center text-sm font-medium"
        >
          Report Unlicensed School
        </a>
        <a
          href="/reports"
          className="w-full sm:w-auto bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-center text-sm font-medium"
        >
          View Reports
        </a>
        {/* TEMPORARY: Test button for ReportDetailsCard component */}
        <a
          href="/test-report-details-card"
          className="w-full sm:w-auto bg-blue-200 text-blue-800 px-4 py-2 rounded-md hover:bg-blue-300 transition-colors text-center text-sm font-medium border-2 border-blue-400"
        >
          Test ReportDetailsCard
        </a>
      </div>

      {/* Recent Reports Section */}
      {reports.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Recent Reports
          </h2>
          
          {/* Responsive Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reports.map((report) => (
              <ReportSummaryCard key={report.id} report={report} />
            ))}
          </div>
        </div>
      )}

      {/* No Reports State */}
      {reports.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No reports found.</p>
          <a
            href="/report"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit First Report
          </a>
        </div>
      )}
    </div>
  );
};

export default HomePage;