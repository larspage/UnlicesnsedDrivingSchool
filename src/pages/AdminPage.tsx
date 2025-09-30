import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import StatusManagementModal from '../components/StatusManagementModal';
import EmailComposerModal from '../components/EmailComposerModal';
import ConfigurationModal from '../components/ConfigurationModal';
import BulkOperationsModal from '../components/BulkOperationsModal';
import AuditLogViewer from '../components/AuditLogViewer';
import AuditService from '../services/auditService';
import ConfigurationService from '../services/configurationService';
import { apiClient } from '../services/api';
import { Report, ReportStatus, StatusUpdateData } from '../types';

const AdminPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    totalFiles: 0
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isConfigurationModalOpen, setIsConfigurationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const auditService = AuditService.getInstance();
  const configurationService = ConfigurationService.getInstance();

  useEffect(() => {
    // Set active tab based on current route
    const path = location.pathname.split('/admin/')[1];
    if (path && path !== 'overview') {
      setActiveTab(path);
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  // Fetch real data from API
  const fetchStats = async () => {
    try {
      // Fetch all reports to calculate stats
      const response = await apiClient.getReports({ limit: 1000 }); // Get all reports for stats

      if (response.success && response.data) {
        const reports = response.data.items;
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.status === 'Added').length;
        const completedReports = reports.filter(r => r.status === 'Closed').length;

        // Calculate total files (this would need a separate API call in real implementation)
        const totalFiles = reports.reduce((acc, report) => {
          return acc + (report.uploadedFiles ? report.uploadedFiles.length : 0);
        }, 0);

        setStats({
          totalReports,
          pendingReports,
          completedReports,
          totalFiles
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      // Fallback to default stats if API fails
      setStats({
        totalReports: 0,
        pendingReports: 0,
        completedReports: 0,
        totalFiles: 0
      });
    }
  };

  const fetchReports = async () => {
    try {
      // Fetch reports with no limit to get all data
      const response = await apiClient.getReports({
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (response.success && response.data) {
        // Convert API response format to our internal format
        const apiReports: Report[] = response.data.items.map(apiReport => ({
          id: apiReport.id,
          schoolName: apiReport.schoolName,
          location: apiReport.location,
          violationDescription: apiReport.violationDescription,
          phoneNumber: apiReport.phoneNumber,
          websiteUrl: apiReport.websiteUrl,
          uploadedFiles: [], // Convert File[] to UploadedFile[] - would need separate API call
          socialMediaLinks: apiReport.socialMediaLinks,
          additionalInfo: apiReport.additionalInfo,
          status: apiReport.status as ReportStatus,
          lastReported: apiReport.lastReported,
          createdAt: apiReport.createdAt,
          updatedAt: apiReport.updatedAt,
          reporterIp: '', // API doesn't expose this for security
          adminNotes: '', // Would need separate API endpoint
          mvcReferenceNumber: '', // Would need separate API endpoint
          reporterName: '', // Would need separate API endpoint
          reporterPhone: '', // Would need separate API endpoint
          reporterSchool: '', // Would need separate API endpoint
          reporterEmail: '' // Would need separate API endpoint
        }));

        setReports(apiReports);
      } else {
        console.warn('Failed to fetch reports from API, using empty array');
        setReports([]);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchReports();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchStats(), fetchReports()]);
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = async (reportId: string, updateData: StatusUpdateData) => {
    setIsLoading(true);
    try {
      // Call the real API to update report status
      const response = await apiClient.updateReportStatus(reportId, {
        status: updateData.status,
        adminNotes: updateData.adminNotes,
        mvcReferenceNumber: updateData.mvcReferenceNumber
      });

      if (response.success) {
        // Update the report in the local state
        setReports(prevReports =>
          prevReports.map(report =>
            report.id === reportId
              ? {
                  ...report,
                  status: updateData.status,
                  adminNotes: updateData.adminNotes,
                  mvcReferenceNumber: updateData.mvcReferenceNumber,
                  updatedAt: response.data?.updatedAt || new Date().toISOString()
                }
              : report
          )
        );

        // Update stats if needed
        if (updateData.status === 'Closed') {
          setStats(prev => ({
            ...prev,
            completedReports: prev.completedReports + 1,
            pendingReports: Math.max(0, prev.pendingReports - 1)
          }));
        }

        // Refresh data to ensure consistency
        await refreshData();
      } else {
        throw new Error(response.message || 'Failed to update report status');
      }

    } catch (error) {
      console.error('Failed to update report status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openStatusModal = (report: Report) => {
    setSelectedReport(report);
    setIsStatusModalOpen(true);
  };

  const handleOpenStatusModal = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      openStatusModal(report);
    }
  };

  const closeStatusModal = () => {
    setIsStatusModalOpen(false);
    setSelectedReport(null);
  };

  const openEmailModal = (report: Report) => {
    setSelectedReport(report);
    setIsEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    setSelectedReport(null);
  };

  const handleSendEmail = async (emailData: any) => {
    setIsLoading(true);
    try {
      // Call the real API to send email
      const response = await apiClient.sendEmail({
        reportId: selectedReport?.id || undefined,
        templateId: emailData.templateId,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        attachments: emailData.attachments
      });

      if (response.success) {
        alert('Email sent successfully!');
      } else {
        throw new Error(response.message || 'Failed to send email');
      }

    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openConfigurationModal = () => {
    setIsConfigurationModalOpen(true);
  };

  const closeConfigurationModal = () => {
    setIsConfigurationModalOpen(false);
  };

  const handleSaveConfiguration = async (settings: any) => {
    setIsLoading(true);
    try {
      // Save configuration using the configuration service
      const success = configurationService.saveConfiguration(settings, 'admin');

      if (!success) {
        throw new Error('Failed to save configuration');
      }

      // Show success message
      alert('Configuration saved successfully!');

      // Update the configuration tab display with current settings
      const configSummary = configurationService.getConfigurationSummary();

      // In real implementation, you might want to refresh the app or update local state
      console.log('Configuration updated:', settings);

    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Operations Functions
  const handleSelectReport = (reportId: string, isSelected: boolean) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(reportId);
      } else {
        newSet.delete(reportId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedReports(new Set(filteredReports.map(report => report.id)));
    } else {
      setSelectedReports(new Set());
    }
  };

  const openBulkModal = () => {
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
  };

  const handleBulkStatusUpdate = async (newStatus: ReportStatus, adminNotes?: string) => {
    if (selectedReports.size === 0) {
      alert('Please select at least one report');
      return;
    }

    setIsLoading(true);
    try {
      // Call the real API for bulk status update
      const response = await apiClient.bulkUpdateReportStatus(
        Array.from(selectedReports),
        { status: newStatus, adminNotes }
      );

      if (response.success) {
        // Update the reports in the local state
        setReports(prevReports =>
          prevReports.map(report =>
            selectedReports.has(report.id)
              ? {
                  ...report,
                  status: newStatus,
                  adminNotes: adminNotes || report.adminNotes,
                  updatedAt: new Date().toISOString()
                }
              : report
          )
        );

        // Clear selection and close modal
        setSelectedReports(new Set());
        setIsBulkModalOpen(false);

        // Refresh data to ensure consistency
        await refreshData();

        // Show success message
        const { updated, failed } = response.data || { updated: 0, failed: 0 };
        alert(`Bulk update completed: ${updated} updated, ${failed} failed`);
      } else {
        throw new Error(response.message || 'Failed to perform bulk update');
      }

    } catch (error) {
      console.error('Failed to bulk update reports:', error);
      alert('Failed to update reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter reports based on search and status filter
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.location && report.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'reports', label: 'Manage Reports', icon: '📋' },
    { id: 'configuration', label: 'Configuration', icon: '⚙️' },
    { id: 'audit', label: 'Audit Log', icon: '📝' }
  ];

  return (
    <div className="admin-dashboard">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-blue-100">Manage NJDSC Compliance Portal operations and settings</p>
          </div>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              to={`/admin/${item.id}`}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === item.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Dashboard Content */}
      <Routes>
        <Route path="/" element={<OverviewTab stats={stats} reports={reports} />} />
        <Route path="/overview" element={<OverviewTab stats={stats} reports={reports} />} />
        <Route
          path="/reports"
          element={
            <ReportsTab
              reports={reports}
              filteredReports={filteredReports}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onOpenStatusModal={handleOpenStatusModal}
              onOpenEmailModal={openEmailModal}
              selectedReports={selectedReports}
              onSelectReport={handleSelectReport}
              onSelectAll={handleSelectAll}
              onOpenBulkModal={openBulkModal}
            />
          }
        />
        <Route path="/configuration" element={<ConfigurationTab onOpenConfigurationModal={openConfigurationModal} />} />
        <Route path="/audit" element={<AuditTab />} />
      </Routes>

      {/* Status Management Modal */}
      <StatusManagementModal
        isOpen={isStatusModalOpen}
        onClose={closeStatusModal}
        report={selectedReport}
        onStatusUpdate={handleStatusUpdate}
        isLoading={isLoading}
      />

      {/* Email Composer Modal */}
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={closeEmailModal}
        report={selectedReport}
        onSendEmail={handleSendEmail}
        isLoading={isLoading}
      />

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={isConfigurationModalOpen}
        onClose={closeConfigurationModal}
        onSave={handleSaveConfiguration}
        isLoading={isLoading}
      />

      {/* Bulk Operations Modal */}
      <BulkOperationsModal
        isOpen={isBulkModalOpen}
        onClose={closeBulkModal}
        selectedCount={selectedReports.size}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        isLoading={isLoading}
      />
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats, reports }: { stats: any, reports: Report[] }) => {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const loadActivity = async () => {
      // Get recent reports (last 5)
      const recentReports = reports
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Get recent audit logs
      const auditService = AuditService.getInstance();
      const logs = await auditService.getAuditLogs();
      const recentLogs = logs.slice(0, 10);
      setAuditLogs(recentLogs);

      // Combine recent reports and audit logs for activity feed
      const activities = [
        ...recentReports.map(report => ({
          type: 'report',
          title: `New report submitted: ${report.schoolName}`,
          timestamp: report.createdAt,
          status: 'New',
          statusColor: 'bg-blue-100 text-blue-800'
        })),
        ...recentLogs.map((log: any) => ({
          type: 'audit',
          title: log.details,
          timestamp: log.timestamp,
          status: auditService.getActionDisplayInfo(log.action as any).label,
          statusColor: 'bg-gray-100 text-gray-800'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 5);

      setRecentActivity(activities);
    };

    loadActivity();
  }, [reports]);

  const cards = [
    {
      title: 'Total Reports',
      value: stats.totalReports,
      icon: '📋',
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Reports',
      value: stats.pendingReports,
      icon: '⏳',
      color: 'bg-yellow-500'
    },
    {
      title: 'Completed Reports',
      value: stats.completedReports,
      icon: '✅',
      color: 'bg-green-500'
    }
  ];

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = (now.getTime() - time.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${card.color} text-white mr-4`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No recent activity
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-gray-600">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                  <span className={`px-2 py-1 ${activity.statusColor} rounded-full text-xs`}>
                    {activity.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Google Drive API</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Google Sheets API</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Gmail Service</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reports Management Tab Component
const ReportsTab = ({
  reports,
  filteredReports,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onOpenStatusModal,
  onOpenEmailModal,
  selectedReports,
  onSelectReport,
  onSelectAll,
  onOpenBulkModal
}: {
  reports: Report[];
  filteredReports: Report[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: ReportStatus | 'all';
  setStatusFilter: (status: ReportStatus | 'all') => void;
  onOpenStatusModal: (reportId: string) => void;
  onOpenEmailModal: (report: Report) => void;
  selectedReports: Set<string>;
  onSelectReport: (reportId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  onOpenBulkModal: () => void;
}) => {
  const statusOptions: { value: ReportStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Statuses', color: 'bg-gray-100 text-gray-800' },
    { value: 'Added', label: 'Added', color: 'bg-gray-100 text-gray-800' },
    { value: 'Confirmed by NJDSC', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'Reported to MVC', label: 'Reported to MVC', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Under Investigation', label: 'Under Investigation', color: 'bg-orange-100 text-orange-800' },
    { value: 'Closed', label: 'Closed', color: 'bg-green-100 text-green-800' }
  ];

  const getStatusColor = (status: ReportStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports Management</h2>
            <p className="text-gray-600 mt-1">
              Manage and update report statuses, view details, and perform bulk operations.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {selectedReports.size > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                {selectedReports.size} selected
              </span>
            )}
            <button
              onClick={onOpenBulkModal}
              disabled={selectedReports.size === 0}
              className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selectedReports.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Bulk Actions {selectedReports.size > 0 && `(${selectedReports.size})`}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Reports
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by school name, ID, or location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
            <div className="text-sm text-gray-600">Total Reports</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {reports.filter(r => r.status === 'Added').length}
            </div>
            <div className="text-sm text-gray-600">New Reports</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {reports.filter(r => r.status === 'Under Investigation' || r.status === 'Reported to MVC').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'Closed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Reports ({filteredReports.length})
          </h3>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No reports found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredReports.length > 0 && selectedReports.size === filteredReports.length}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={(e) => onSelectReport(report.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.schoolName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {report.id}
                          </div>
                          {report.location && (
                            <div className="text-sm text-gray-500">
                              📍 {report.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onOpenStatusModal(report.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() => {
                            const reportData = reports.find(r => r.id === report.id);
                            if (reportData) onOpenEmailModal(reportData);
                          }}
                          className="text-green-600 hover:text-green-900 text-sm"
                          disabled={!report.reporterEmail}
                        >
                          Send Email
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 text-sm">
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Configuration Tab Component
const ConfigurationTab = ({ onOpenConfigurationModal }: { onOpenConfigurationModal: () => void }) => {
  const configurationService = ConfigurationService.getInstance();
  const [configSummary, setConfigSummary] = useState({
    apiConfigured: false,
    securityEnabled: false,
    notificationsActive: false,
    lastUpdated: '',
    version: ''
  });

  useEffect(() => {
    // Load current configuration summary
    const summary = configurationService.getConfigurationSummary();
    setConfigSummary(summary);
  }, []);

  const refreshConfigSummary = () => {
    const summary = configurationService.getConfigurationSummary();
    setConfigSummary(summary);
  };

  const handleConfigurationModalClose = () => {
    // Refresh the summary when configuration modal closes
    refreshConfigSummary();
  };

  return (
    <div className="space-y-6">
      {/* Header and Primary Action */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
            <p className="text-gray-600 mt-1">
              Manage API settings, system preferences, and security configurations
            </p>
          </div>
          <button
            onClick={onOpenConfigurationModal}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Manage Settings</span>
          </button>
        </div>

        {/* Current Configuration Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">API Status</p>
                <p className={`text-sm ${configSummary.apiConfigured ? 'text-green-600' : 'text-red-600'}`}>
                  {configSummary.apiConfigured ? 'Configured' : 'Not Configured'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Security</p>
                <p className={`text-sm ${configSummary.securityEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {configSummary.securityEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Notifications</p>
                <p className={`text-sm ${configSummary.notificationsActive ? 'text-green-600' : 'text-gray-600'}`}>
                  {configSummary.notificationsActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Last Updated</p>
                <p className="text-sm text-gray-600">
                  {configSummary.lastUpdated ? new Date(configSummary.lastUpdated).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Configuration Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Google Drive API</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                configurationService.getConfiguration().googleDriveFolderId
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {configurationService.getConfiguration().googleDriveFolderId ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Google Sheets API</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                configurationService.getConfiguration().googleSheetsId
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {configurationService.getConfiguration().googleSheetsId ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Gmail API</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                configurationService.getConfiguration().gmailUserId
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {configurationService.getConfiguration().gmailUserId ? 'Configured' : 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* System Settings Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Settings</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Max File Size</span>
              <span className="text-sm font-medium">{configurationService.getConfiguration().maxFileSize} MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Allowed File Types</span>
              <span className="text-sm font-medium">{configurationService.getConfiguration().allowedFileTypes.length} types</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                configurationService.getConfiguration().requireAuthentication
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {configurationService.getConfiguration().requireAuthentication ? 'Required' : 'Optional'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Duplicate Check</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                configurationService.getConfiguration().duplicateCheckEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {configurationService.getConfiguration().duplicateCheckEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Configuration Changes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Changes</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Configuration loaded from storage</p>
              <p className="text-sm text-gray-600">
                Version {configSummary.version} • {configSummary.lastUpdated ? new Date(configSummary.lastUpdated).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">System</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Default settings applied</p>
              <p className="text-sm text-gray-600">Initial configuration loaded</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Setup</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Audit Log Tab Component
const AuditTab = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">System Audit Log</h2>
        <p className="text-gray-600 mb-6">
          View system activity, admin actions, and audit trail for compliance purposes.
        </p>

        {/* Audit Log Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Total Actions</p>
                <p className="text-lg font-bold text-blue-700">147</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Today</p>
                <p className="text-lg font-bold text-green-700">23</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-900">Active Users</p>
                <p className="text-lg font-bold text-yellow-700">3</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">This Week</p>
                <p className="text-lg font-bold text-purple-700">89</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
};

export default AdminPage;