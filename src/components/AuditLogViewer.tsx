import { useState, useEffect } from 'react';
import { AuditLogEntry, AuditAction, AuditLogFilters } from '../types';
import AuditService from '../services/auditService';

interface AuditLogViewerProps {
  reportId?: string; // If provided, show only logs for this report
  className?: string;
}

const AuditLogViewer = ({ reportId, className = '' }: AuditLogViewerProps) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [isLoading, setIsLoading] = useState(false);

  const auditService = AuditService.getInstance();

  useEffect(() => {
    loadAuditLogs();
  }, [reportId]);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      let logs: AuditLogEntry[];

      if (reportId) {
        logs = await auditService.getReportAuditLogs(reportId);
      } else {
        logs = await auditService.getAuditLogs();
      }

      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.adminUser) {
      filtered = filtered.filter(log =>
        log.adminUser.toLowerCase().includes(filters.adminUser!.toLowerCase())
      );
    }

    if (filters.targetType) {
      filtered = filtered.filter(log => log.targetType === filters.targetType);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log => log.timestamp >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log => log.timestamp <= filters.dateTo!);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.details.toLowerCase().includes(searchLower) ||
        log.adminUser.toLowerCase().includes(searchLower) ||
        (log.targetId && log.targetId.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getActionDisplayInfo = (action: AuditAction) => {
    return auditService.getActionDisplayInfo(action);
  };

  const formatTimestamp = (timestamp: string) => {
    return auditService.formatTimestamp(timestamp);
  };

  const actionOptions: { value: AuditAction; label: string }[] = [
    { value: 'STATUS_UPDATE', label: 'Status Updates' },
    { value: 'BULK_STATUS_UPDATE', label: 'Bulk Updates' },
    { value: 'EMAIL_SENT', label: 'Emails Sent' },
    { value: 'CONFIGURATION_UPDATE', label: 'Configuration Changes' },
    { value: 'LOGIN', label: 'Logins' },
    { value: 'LOGOUT', label: 'Logouts' },
    { value: 'REPORT_VIEW', label: 'Report Views' },
    { value: 'ADMIN_NOTE_ADDED', label: 'Notes Added' },
    { value: 'MVC_REFERENCE_ADDED', label: 'MVC References' }
  ];

  const targetTypeOptions: { value: AuditLogEntry['targetType']; label: string }[] = [
    { value: 'report', label: 'Reports' },
    { value: 'configuration', label: 'Configuration' },
    { value: 'system', label: 'System' },
    { value: 'email', label: 'Email' },
    { value: 'bulk', label: 'Bulk Operations' }
  ];

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {reportId ? 'Report Audit Log' : 'System Audit Log'}
          </h3>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.searchTerm || ''}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search logs..."
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Type
            </label>
            <select
              value={filters.targetType || ''}
              onChange={(e) => handleFilterChange('targetType', e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {targetTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin User
            </label>
            <input
              type="text"
              value={filters.adminUser || ''}
              onChange={(e) => handleFilterChange('adminUser', e.target.value)}
              placeholder="Filter by user..."
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="datetime-local"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="datetime-local"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-x-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {auditLogs.length === 0 ? 'No audit logs found.' : 'No logs match the current filters.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => {
                const actionInfo = getActionDisplayInfo(log.action as AuditAction);
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{actionInfo.icon}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${actionInfo.color}-100 text-${actionInfo.color}-800`}>
                          {actionInfo.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.adminUser}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md truncate" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.targetId ? (
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.targetId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {filteredLogs.length} of {auditLogs.length} entries
          </span>
          <span>
            Last updated: {formatTimestamp(auditLogs[0]?.timestamp || new Date().toISOString())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;