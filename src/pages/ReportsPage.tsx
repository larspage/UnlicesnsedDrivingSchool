import React, { useState, useEffect } from 'react';
import { apiClient, Report, UploadedFile } from '../services/api';
import PhotoPager from '../components/PhotoPager';

interface ReportsPageState {
  reports: Report[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalReports: number;
  searchTerm: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const ReportsPage: React.FC = () => {
  const [state, setState] = useState<ReportsPageState>({
    reports: [],
    loading: true,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalReports: 0,
    searchTerm: '',
    statusFilter: '',
    sortBy: 'lastReported',
    sortOrder: 'desc'
  });

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Fetch reports from API
  const fetchReports = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = {
        page: state.currentPage,
        limit: 20,
        search: state.searchTerm || undefined,
        status: state.statusFilter || undefined,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      };

      const response = await apiClient.getReports(params);

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          reports: response.data!.items,
          totalPages: response.data!.pagination.totalPages,
          totalReports: response.data!.pagination.total,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch reports',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        loading: false
      }));
    }
  };

  // Effect to fetch reports when filters change
  useEffect(() => {
    fetchReports();
  }, [state.currentPage, state.searchTerm, state.statusFilter, state.sortBy, state.sortOrder]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      searchTerm: e.target.value,
      currentPage: 1 // Reset to first page when searching
    }));
  };

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(prev => ({
      ...prev,
      statusFilter: e.target.value,
      currentPage: 1 // Reset to first page when filtering
    }));
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    setState(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      currentPage: 1
    }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  // Handle viewing report details
  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'investigating':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    if (state.totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 mx-1 rounded ${
            i === state.currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center items-center mt-8 space-x-2">
        <button
          onClick={() => handlePageChange(state.currentPage - 1)}
          disabled={state.currentPage === 1}
          className="px-3 py-2 rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(state.currentPage + 1)}
          disabled={state.currentPage === state.totalPages}
          className="px-3 py-2 rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  // Render report detail modal
  const renderReportDetail = () => {
    if (!selectedReport) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Report Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">School Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedReport.schoolName}</p>
              </div>

              {selectedReport.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.location}</p>
                </div>
              )}

              {selectedReport.violationDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Violation Description</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedReport.violationDescription}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedReport.phoneNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.phoneNumber}</p>
                  </div>
                )}

                {selectedReport.websiteUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website/Social Media</label>
                    <a
                      href={selectedReport.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline block"
                    >
                      {selectedReport.websiteUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedReport.status)}`}>
                    {selectedReport.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Reported</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.lastReported)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.createdAt)}</p>
              </div>
            </div>

            {/* Photos Section */}
            {selectedReport.uploadedFiles && selectedReport.uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-4">
                  Photos ({selectedReport.uploadedFiles.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedReport.uploadedFiles.map((file, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      {file.type.startsWith('image/') ? (
                        <div className="aspect-w-16 aspect-h-12 bg-gray-100">
                          <img
                            src={file.thumbnailUrl || file.url}
                            alt={file.name}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 bg-gray-100">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <div className="mt-2">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            View Full Size
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Reported Schools</h1>
        <p className="text-gray-600 text-sm md:text-base">
          Browse reports of unlicensed driving schools submitted by the community.
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Schools
            </label>
            <input
              type="text"
              id="search"
              value={state.searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by school name or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              id="status"
              value={state.statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Results Summary */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {state.loading ? (
                'Loading...'
              ) : (
                `Showing ${state.reports.length} of ${state.totalReports} reports`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading reports</h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('schoolName')}
                >
                  School Name
                  {state.sortBy === 'schoolName' && (
                    <span className="ml-1">
                      {state.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('location')}
                >
                  Location
                  {state.sortBy === 'location' && (
                    <span className="ml-1">
                      {state.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('status')}
                >
                  Status
                  {state.sortBy === 'status' && (
                    <span className="ml-1">
                      {state.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('lastReported')}
                >
                  Last Reported
                  {state.sortBy === 'lastReported' && (
                    <span className="ml-1">
                      {state.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading reports...</span>
                    </div>
                  </td>
                </tr>
              ) : state.reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No reports found matching your criteria.
                  </td>
                </tr>
              ) : (
                state.reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{report.schoolName}</div>
                      {/* Show location and date on mobile */}
                      <div className="md:hidden text-xs text-gray-500 mt-1">
                        {report.location && `${report.location} • `}
                        {formatDate(report.lastReported)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.location || 'Not specified'}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)}`}>
                        {report.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(report.lastReported)}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(report)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {renderPagination()}

      {/* Report Detail Modal */}
      {renderReportDetail()}
    </div>
  );
};

export default ReportsPage;