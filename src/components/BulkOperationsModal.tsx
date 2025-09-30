
import { useState, useEffect } from 'react';
import { ReportStatus } from '../types';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onBulkStatusUpdate: (newStatus: ReportStatus, adminNotes?: string) => Promise<void>;
  isLoading?: boolean;
}

const BulkOperationsModal = ({
  isOpen,
  onClose,
  selectedCount,
  onBulkStatusUpdate,
  isLoading = false
}: BulkOperationsModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>('Added');
  const [adminNotes, setAdminNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Status options with descriptions
  const statusOptions: { value: ReportStatus; label: string; description: string; color: string }[] = [
    {
      value: 'Added',
      label: 'Added',
      description: 'Initial status when report is first submitted',
      color: 'bg-gray-100 text-gray-800'
    },
    {
      value: 'Confirmed by NJDSC',
      label: 'Confirmed by NJDSC',
      description: 'Report has been reviewed and confirmed by NJDSC staff',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      value: 'Reported to MVC',
      label: 'Reported to MVC',
      description: 'Violation has been reported to Motor Vehicle Commission',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      value: 'Under Investigation',
      label: 'Under Investigation',
      description: 'Case is currently being investigated',
      color: 'bg-orange-100 text-orange-800'
    },
    {
      value: 'Closed',
      label: 'Closed',
      description: 'Investigation completed and case closed',
      color: 'bg-green-100 text-green-800'
    }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus('Added');
      setAdminNotes('');
      setErrors({});
    }
  }, [isOpen]);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedStatus) {
      newErrors.status = 'Status is required';
    }

    // Admin notes are required for status changes (except initial "Added" status)
    if (selectedStatus !== 'Added' && !adminNotes.trim()) {
      newErrors.adminNotes = 'Admin notes are required for status updates';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onBulkStatusUpdate(selectedStatus, adminNotes.trim() || undefined);
    } catch (error) {
      console.error('Bulk operation failed:', error);
      setErrors({ submit: 'Bulk operation failed. Please try again.' });
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Operations</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update {selectedCount} selected reports
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Selected Reports Summary */}
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Bulk Operation Confirmation
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      You are about to update the status of <strong>{selectedCount}</strong> reports to <strong>{selectedStatus}</strong>.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              New Status *
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${option.color}`}>
                        {option.value}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
          </div>

          {/* Admin Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Notes {selectedStatus !== 'Added' ? '*' : '(Optional)'}
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this bulk status change..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.adminNotes ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.adminNotes && (
              <p className="mt-1 text-sm text-red-600">{errors.adminNotes}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              These notes will be visible in the audit log and report history for all updated reports.
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Updating Reports...' : `Update ${selectedCount} Reports`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkOperationsModal;