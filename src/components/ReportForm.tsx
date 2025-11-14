import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';
import { apiClient, convertFileToBase64, ReportSubmission } from '../services/api';

interface FormData {
  schoolName: string;
  location: string;
  violationDescription: string;
  phoneNumber: string;
  websiteUrl: string;
  reporterName: string;
  reporterPhone: string;
  reporterSchool: string;
  reporterEmail: string;
}

interface FormErrors {
  schoolName?: string;
  location?: string;
  violationDescription?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterSchool?: string;
  reporterEmail?: string;
  files?: string;
  submit?: string;
}

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    location: '',
    violationDescription: '',
    phoneNumber: '',
    websiteUrl: '',
    reporterName: '',
    reporterPhone: '',
    reporterSchool: '',
    reporterEmail: ''
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
    if (errors.files) {
      setErrors(prev => ({ ...prev, files: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.schoolName.trim() || formData.schoolName.trim().length < 2) {
      newErrors.schoolName = 'School name is required and must be at least 2 characters';
    }
    if (formData.phoneNumber && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL';
    }
    if (!formData.reporterPhone.trim()) {
      newErrors.reporterPhone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.reporterPhone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.reporterPhone = 'Please enter a valid phone number';
    }
    if (formData.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporterEmail)) {
      newErrors.reporterEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const files: { name: string; type: string; size: number; data: string }[] = [];

      for (const file of selectedFiles) {
        try {
          const base64Data = await convertFileToBase64(file);
          files.push({ name: file.name, type: file.type, size: file.size, data: base64Data });
        } catch (fileError) {
          console.error('Error processing file:', file.name, fileError);
          setErrors({ files: `Failed to process file: ${file.name}` });
          setIsSubmitting(false);
          return;
        }
      }

      const submissionData: ReportSubmission = {
        schoolName: formData.schoolName.trim(),
        location: formData.location.trim() || undefined,
        violationDescription: formData.violationDescription.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        reporterName: formData.reporterName.trim() || undefined,
        reporterPhone: formData.reporterPhone.trim() || undefined,
        reporterSchool: formData.reporterSchool.trim() || undefined,
        reporterEmail: formData.reporterEmail.trim() || undefined,
        files: files.length > 0 ? files : undefined
      };

      const response = await apiClient.submitReport(submissionData);

      if (response.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate('/reports');
        }, 3000);
      } else {
        setErrors({ submit: response.message || 'Failed to submit report' });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-12 px-4 card max-w-2xl mx-auto">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold text-green-600 mb-4">Report Submitted!</h2>
        <p className="text-dim-gray mb-6">
          Thank you for your submission. Your report will be reviewed by our compliance team.
        </p>
        <p className="text-sm text-dim-gray/70">Redirecting to the reports page...</p>
      </div>
    );
  }

  return (
    <div className="form-wrapper max-w-3xl mx-auto px-2 sm:px-4" data-testid="form-wrapper">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-dim-gray mb-6 sm:mb-8 text-center tracking-tight" data-testid="form-title">
        Report an Unlicensed Driving School
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="report-form">
        {/* School Details Section */}
        <div className="school-details-card card" data-testid="school-details-card">
          <div className="table-container overflow-x-auto" data-testid="school-details-table-container">
            <table className="w-full border-collapse" data-testid="school-details-table">
              <colgroup data-testid="school-details-colgroup">
                <col className="w-[20%]" data-testid="school-label-col" />
                <col className="w-[30%]" data-testid="school-input-col" />
                <col className="w-[20%]" data-testid="location-label-col" />
                <col className="w-[30%]" data-testid="location-input-col" />
              </colgroup>
            <tbody>
              {/* Row 1: School Name (and Location on large screens) */}
              <tr className="border-b border-pearl/50">
                <td className="py-2 sm:py-3 pr-2 sm:pr-3 align-top">
                  <label htmlFor="schoolName" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    School Name <span className="text-red-500">*</span>
                  </label>
                </td>
                <td className="py-2 sm:py-3 px-2 sm:px-3">
                  <input
                    type="text"
                    id="schoolName"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                      errors.schoolName ? 'border-red-500' : 'border-pearl'
                    }`}
                    placeholder="e.g., ABC Driving School"
                    maxLength={255}
                  />
                  {errors.schoolName && <p className="mt-1 text-xs text-red-500">{errors.schoolName}</p>}
                </td>
                <td className="py-3 px-3 align-top hidden lg:table-cell">
                  <label htmlFor="location" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Location
                  </label>
                </td>
                <td className="py-3 pl-2 hidden lg:table-cell">
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                      errors.location ? 'border-red-500' : 'border-pearl'
                    }`}
                    placeholder="e.g., Newark, NJ"
                    maxLength={100}
                  />
                  {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
                </td>
              </tr>

              {/* Row 2: Location (small/medium screens only) */}
              <tr className="border-b border-pearl/50 lg:hidden">
                <td className="py-3 pr-3 align-top">
                  <label htmlFor="location-sm" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Location
                  </label>
                </td>
                <td className="py-3 px-2" colSpan={3}>
                  <input
                    type="text"
                    id="location-sm"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                      errors.location ? 'border-red-500' : 'border-pearl'
                    }`}
                    placeholder="e.g., Newark, NJ"
                    maxLength={100}
                  />
                  {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
                </td>
              </tr>

              {/* Row 3: Phone Number (and Website on large screens) */}
              <tr className="border-b border-pearl/50">
                <td className="py-3 pr-2 align-top">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Phone Number
                  </label>
                </td>
                <td className="py-3 px-3">
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                      errors.phoneNumber ? 'border-red-500' : 'border-pearl'
                    }`}
                    placeholder="+1-555-123-4567"
                  />
                  {errors.phoneNumber && <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>}
                </td>
                <td className="py-3 px-3 align-top hidden lg:table-cell">
                  <label htmlFor="websiteUrl" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Website/Social Media
                  </label>
                </td>
                <td className="py-3 pl-2 hidden lg:table-cell">
                  <input
                    type="url"
                    id="websiteUrl"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                      errors.websiteUrl ? 'border-red-500' : 'border-pearl'
                    }`}
                    placeholder="https://example.com"
                  />
                  {errors.websiteUrl && <p className="mt-1 text-xs text-red-500">{errors.websiteUrl}</p>}
                </td>
              </tr>

              {/* Row 4: Website (small/medium screens only) */}
              <tr className="border-b border-pearl/50 lg:hidden">
                <td className="py-3 pr-2 align-top">
                  <label htmlFor="websiteUrl-sm" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Website/Social Media
                  </label>
                </td>
                <td className="py-3 px-3" colSpan={3}>
                  <input
                    type="url"
                    id="websiteUrl-sm"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                      errors.websiteUrl ? 'border-red-500' : 'border-pearl'
                    }`}
                    placeholder="https://example.com"
                  />
                  {errors.websiteUrl && <p className="mt-1 text-xs text-red-500">{errors.websiteUrl}</p>}
                </td>
              </tr>

              {/* Row 5: Violation Description (full width) */}
              <tr className="border-b border-pearl/50">
                <td className="py-2 pr-2 align-top">
                  <label htmlFor="violationDescription" className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Reason for Suspicion
                  </label>
                </td>
                <td className="py-2 px-2" colSpan={3}>
                  <div className="flex items-start gap-2">
                    <textarea
                      id="violationDescription"
                      name="violationDescription"
                      value={formData.violationDescription}
                      onChange={handleInputChange}
                      rows={2}
                      className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.violationDescription ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="Describe the violation or issue in detail..."
                      maxLength={1000}
                    />
                    <div className="flex flex-col items-end">
                      <p className="text-xs text-dim-gray/50 whitespace-nowrap">{formData.violationDescription.length}/1000</p>
                      {errors.violationDescription && <p className="text-xs text-red-500 mt-1">{errors.violationDescription}</p>}
                    </div>
                  </div>
                </td>
              </tr>

              {/* Row 6: Supporting Files (full width) */}
              <tr>
                <td className="py-2 pr-2 align-top">
                  <label className="block text-sm font-medium text-dim-gray text-left pt-2">
                    Supporting Files
                  </label>
                </td>
                <td className="py-2 px-2" colSpan={3}>
                  <div className="max-w-full">
                    <FileUpload onFilesChange={handleFilesChange} maxFiles={10} />
                    {errors.files && <p className="mt-1 text-xs text-red-500">{errors.files}</p>}
                  </div>
                </td>
              </tr>
             </tbody>
           </table>
         </div>
       </div>

        {/* Reporter Information Section */}
        <div className="reporter-info-card card" data-testid="reporter-info-card">
          <h2 className="text-2xl font-semibold text-dim-gray mb-2 pb-2 border-b-2 border-pearl">
            Your Information <span className="text-sm font-normal text-dim-gray/70">(Optional)</span>
          </h2>
          <p className="text-sm text-dim-gray/80 mb-4">
            Your contact details are kept confidential and are only used for follow-up purposes.
          </p>
          <div className="table-container overflow-x-auto" data-testid="reporter-info-table-container">
            <table className="w-full border-collapse" data-testid="reporter-info-table">
              <colgroup data-testid="reporter-info-colgroup">
                <col className="w-[20%]" data-testid="reporter-label-col" />
                <col className="w-[30%]" data-testid="reporter-input-col" />
                <col className="w-[20%]" data-testid="school-label-col" />
                <col className="w-[30%]" data-testid="school-input-col" />
              </colgroup>
              <tbody>
                {/* Row 1: Name (and Phone on large screens) */}
                <tr className="border-b border-pearl/50">
                  <td className="py-3 pr-2 align-top">
                    <label htmlFor="reporterName" className="block text-sm font-medium text-dim-gray text-left pt-2">
                      Your Name
                    </label>
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      id="reporterName"
                      name="reporterName"
                      value={formData.reporterName}
                      onChange={handleInputChange}
                      className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.reporterName ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="John Doe"
                      maxLength={255}
                    />
                    {errors.reporterName && <p className="mt-1 text-xs text-red-500">{errors.reporterName}</p>}
                  </td>
                  <td className="py-3 px-3 align-top hidden lg:table-cell">
                    <label htmlFor="reporterPhone" className="block text-sm font-medium text-dim-gray text-left pt-2">
                      Your Phone <span className="text-red-500">*</span>
                    </label>
                  </td>
                  <td className="py-3 pl-2 hidden lg:table-cell">
                    <input
                      type="tel"
                      id="reporterPhone"
                      name="reporterPhone"
                      value={formData.reporterPhone}
                      onChange={handleInputChange}
                      className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.reporterPhone ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="+1-555-987-6543"
                    />
                    <p className="mt-1 text-xs text-dim-gray/70">You will be required to confirm via text that this is your phone number</p>
                    {errors.reporterPhone && <p className="mt-1 text-xs text-red-500">{errors.reporterPhone}</p>}
                  </td>
                </tr>

                {/* Row 2: Phone (small/medium screens only) */}
                <tr className="border-b border-pearl/50 lg:hidden">
                  <td className="py-3 pr-3 align-top">
                    <label htmlFor="reporterPhone-sm" className="block text-sm font-medium text-dim-gray text-left pt-2">
                      Your Phone <span className="text-red-500">*</span>
                    </label>
                  </td>
                  <td className="py-3 px-3" colSpan={3}>
                    <input
                      type="tel"
                      id="reporterPhone-sm"
                      name="reporterPhone"
                      value={formData.reporterPhone}
                      onChange={handleInputChange}
                      className={`w-full max-w-[200px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.reporterPhone ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="+1-555-987-6543"
                    />
                    <p className="mt-1 text-xs text-dim-gray/70">You will be required to confirm via text that this is your phone number</p>
                    {errors.reporterPhone && <p className="mt-1 text-xs text-red-500">{errors.reporterPhone}</p>}
                  </td>
                </tr>

                {/* Row 3: Email (and School on large screens) */}
                <tr className="border-b border-pearl/50">
                  <td className="py-3 pr-2 align-top">
                    <label htmlFor="reporterEmail" className="block text-sm font-medium text-dim-gray text-left pt-2">
                      Your Email
                    </label>
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="email"
                      id="reporterEmail"
                      name="reporterEmail"
                      value={formData.reporterEmail}
                      onChange={handleInputChange}
                      className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.reporterEmail ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="john.doe@example.com"
                      maxLength={255}
                    />
                    {errors.reporterEmail && <p className="mt-1 text-xs text-red-500">{errors.reporterEmail}</p>}
                  </td>
                  <td className="py-3 px-3 align-top hidden lg:table-cell">
                    <label htmlFor="reporterSchool" className="block text-sm font-medium text-dim-gray text-left pt-2">
                      Your School
                    </label>
                  </td>
                  <td className="py-3 pl-2 hidden lg:table-cell">
                    <input
                      type="text"
                      id="reporterSchool"
                      name="reporterSchool"
                      value={formData.reporterSchool}
                      onChange={handleInputChange}
                      className={`w-full max-w-[360px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.reporterSchool ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="XYZ High School"
                      maxLength={255}
                    />
                    {errors.reporterSchool && <p className="mt-1 text-xs text-red-500">{errors.reporterSchool}</p>}
                  </td>
                </tr>

                {/* Row 4: School (small/medium screens only) */}
                <tr className="lg:hidden">
                  <td className="py-3 pr-2 align-top">
                    <label htmlFor="reporterSchool-sm" className="block text-sm font-medium text-dim-gray text-left pt-2">
                      Your School
                    </label>
                  </td>
                  <td className="py-3 px-3" colSpan={3}>
                    <input
                      type="text"
                      id="reporterSchool-sm"
                      name="reporterSchool"
                      value={formData.reporterSchool}
                      onChange={handleInputChange}
                      className={`w-full max-w-[280px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-desert-sand text-sm ${
                        errors.reporterSchool ? 'border-red-500' : 'border-pearl'
                      }`}
                      placeholder="XYZ High School"
                      maxLength={255}
                    />
                    {errors.reporterSchool && <p className="mt-1 text-xs text-red-500">{errors.reporterSchool}</p>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4" data-testid="error-message">
            <p className="text-red-700 text-sm font-medium text-center">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pb-6 mt-6" data-testid="action-buttons">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-300 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>

      {/* Privacy Notice */}
      <div className="mt-6 p-4 card bg-honeydew/30" data-testid="privacy-notice-card">
        <h3 className="text-lg font-semibold text-dim-gray mb-2">Privacy Notice</h3>
        <p className="text-sm text-dim-gray/80">
          Your report is taken seriously. All submissions are reviewed by NJDSC compliance staff. Your contact information, if provided, will be kept confidential and will only be used by our team to follow up on this specific report.
        </p>
      </div>
      </div>
  );
};

export default ReportForm;