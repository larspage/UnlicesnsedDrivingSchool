import { useState, useEffect } from 'react';
import { Report } from '../types';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  description: string;
  variables: string[];
}

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  onSendEmail: (emailData: EmailData) => Promise<void>;
  isLoading?: boolean;
}

interface EmailData {
  to: string;
  subject: string;
  body: string;
  templateId: string;
}

const EmailComposerModal = ({
  isOpen,
  onClose,
  report,
  onSendEmail,
  isLoading = false
}: EmailComposerModalProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailData, setEmailData] = useState<EmailData>({
    to: '',
    subject: '',
    body: '',
    templateId: ''
  });
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Predefined email templates
  const emailTemplates: EmailTemplate[] = [
    {
      id: 'confirmation',
      name: 'Report Confirmation',
      subject: 'NJDSC Report Confirmation - {schoolName}',
      body: `Dear {reporterName},

Thank you for submitting your report regarding {schoolName}. We have received your submission and assigned it report number {reportId}.

Our team will review the information provided and take appropriate action as needed. You can expect to hear from us within 5-7 business days regarding the status of your report.

If you have any additional information or evidence to provide, please don't hesitate to contact us.

Best regards,
NJDSC Compliance Team`,
      description: 'Confirmation email sent to reporters when their report is received',
      variables: ['schoolName', 'reporterName', 'reportId']
    },
    {
      id: 'mvc_notification',
      name: 'MVC Report Notification',
      subject: 'NJDSC Violation Report - {schoolName} - Reported to MVC',
      body: `Dear MVC Compliance Officer,

This is to notify you of a potential driving school violation that has been reported to NJDSC:

School: {schoolName}
Location: {location}
Report ID: {reportId}
Violation Description: {violationDescription}

Our investigation has confirmed this violation and we are forwarding it to your office for further action. Reference number: {mvcReferenceNumber}

Additional details and evidence are available in the attached report.

Please let us know if you need any additional information from our office.

Best regards,
NJDSC Compliance Team`,
      description: 'Formal notification to MVC when a violation is confirmed',
      variables: ['schoolName', 'location', 'reportId', 'violationDescription', 'mvcReferenceNumber']
    },
    {
      id: 'investigation_update',
      name: 'Investigation Update',
      subject: 'Update on NJDSC Investigation - {schoolName}',
      body: `Dear {reporterName},

This is an update regarding your report (ID: {reportId}) concerning {schoolName}.

Our investigation is currently {investigationStatus}. {investigationDetails}

We will continue to monitor this situation and will provide additional updates as new information becomes available.

If you have any questions or additional information, please don't hesitate to contact us.

Best regards,
NJDSC Compliance Team`,
      description: 'Update email to reporters about investigation progress',
      variables: ['reporterName', 'reportId', 'schoolName', 'investigationStatus', 'investigationDetails']
    },
    {
      id: 'case_closed',
      name: 'Case Closed Notification',
      subject: 'NJDSC Case Closed - {schoolName}',
      body: `Dear {reporterName},

We are writing to inform you that your report (ID: {reportId}) regarding {schoolName} has been closed.

Resolution: {resolutionSummary}

Thank you for bringing this matter to our attention. Your report has helped us maintain the standards of driver education in New Jersey.

If you become aware of any similar issues in the future, please don't hesitate to contact us.

Best regards,
NJDSC Compliance Team`,
      description: 'Notification when a case is closed with resolution details',
      variables: ['reporterName', 'reportId', 'schoolName', 'resolutionSummary']
    }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (report && isOpen) {
      setSelectedTemplate(null);
      setEmailData({
        to: report.reporterEmail || '',
        subject: '',
        body: '',
        templateId: ''
      });
      setVariableValues({});
      setErrors({});
    }
  }, [report, isOpen]);

  // Update email data when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const processedSubject = processTemplate(selectedTemplate.subject, variableValues);
      const processedBody = processTemplate(selectedTemplate.body, variableValues);

      setEmailData({
        to: emailData.to,
        subject: processedSubject,
        body: processedBody,
        templateId: selectedTemplate.id
      });
    }
  }, [selectedTemplate, variableValues]);

  const processTemplate = (template: string, variables: Record<string, string>): string => {
    let processed = template;

    // Replace variables in the format {variableName}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      processed = processed.replace(regex, value || `{${key}}`);
    });

    // Replace report-specific variables
    if (report) {
      processed = processed.replace(/{schoolName}/g, report.schoolName || '');
      processed = processed.replace(/{reportId}/g, report.id || '');
      processed = processed.replace(/{location}/g, report.location || '');
      processed = processed.replace(/{violationDescription}/g, report.violationDescription || '');
      processed = processed.replace(/{reporterName}/g, report.reporterName || 'Reporter');
      processed = processed.replace(/{mvcReferenceNumber}/g, report.mvcReferenceNumber || '');
    }

    return processed;
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);

    // Initialize variable values based on report data
    const initialValues: Record<string, string> = {};
    template.variables.forEach(variable => {
      switch (variable) {
        case 'schoolName':
          initialValues.schoolName = report?.schoolName || '';
          break;
        case 'reportId':
          initialValues.reportId = report?.id || '';
          break;
        case 'location':
          initialValues.location = report?.location || '';
          break;
        case 'violationDescription':
          initialValues.violationDescription = report?.violationDescription || '';
          break;
        case 'reporterName':
          initialValues.reporterName = report?.reporterName || 'Reporter';
          break;
        case 'mvcReferenceNumber':
          initialValues.mvcReferenceNumber = report?.mvcReferenceNumber || '';
          break;
        case 'investigationStatus':
          initialValues.investigationStatus = 'in progress';
          break;
        case 'investigationDetails':
          initialValues.investigationDetails = 'We are actively reviewing the evidence provided.';
          break;
        case 'resolutionSummary':
          initialValues.resolutionSummary = 'Violation confirmed and appropriate action taken.';
          break;
      }
    });

    setVariableValues(initialValues);
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!emailData.to.trim()) {
      newErrors.to = 'Recipient email is required';
    } else if (!/\S+@\S+\.\S+/.test(emailData.to)) {
      newErrors.to = 'Please enter a valid email address';
    }

    if (!emailData.subject.trim()) {
      newErrors.subject = 'Email subject is required';
    }

    if (!emailData.body.trim()) {
      newErrors.body = 'Email body is required';
    }

    if (!selectedTemplate) {
      newErrors.template = 'Please select an email template';
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
      await onSendEmail(emailData);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      setErrors({ submit: 'Failed to send email. Please try again.' });
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen || !report) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compose Email</h2>
            <p className="text-sm text-gray-600 mt-1">
              Report: {report.schoolName} (ID: {report.id})
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

        <div className="flex">
          {/* Template Selection Sidebar */}
          <div className="w-1/3 border-r p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
            <div className="space-y-3">
              {emailTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </div>
              ))}
            </div>
            {errors.template && (
              <p className="mt-2 text-sm text-red-600">{errors.template}</p>
            )}
          </div>

          {/* Email Composition */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit}>
              {/* Recipient */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To *
                </label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.to ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.to && <p className="mt-1 text-sm text-red-600">{errors.to}</p>}
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.subject ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
              </div>

              {/* Variable Inputs */}
              {selectedTemplate && selectedTemplate.variables.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Variables
                  </label>
                  <div className="space-y-2">
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable}>
                        <label className="block text-xs text-gray-600 mb-1">
                          {variable.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                        <input
                          type="text"
                          value={variableValues[variable] || ''}
                          onChange={(e) => handleVariableChange(variable, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={`Enter ${variable}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                  rows={12}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.body ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Email content will appear here when a template is selected..."
                />
                {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body}</p>}
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
                  disabled={isLoading || !selectedTemplate}
                >
                  {isLoading ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposerModal;