import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';
import { apiClient, convertFileToBase64, ReportSubmission, UploadedFile } from '../services/api';

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

    // Clear error when user starts typing
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

    // Required fields
    if (!formData.schoolName.trim() || formData.schoolName.trim().length < 2) {
      newErrors.schoolName = 'School name is required and must be at least 2 characters';
    }

    // Phone number validation (school's phone)
    if (formData.phoneNumber && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Website URL validation
    if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL starting with http:// or https://';
    }

    // Reporter phone validation
    if (formData.reporterPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.reporterPhone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.reporterPhone = 'Please enter a valid reporter phone number';
    }

    // Reporter email validation
    if (formData.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporterEmail)) {
      newErrors.reporterEmail = 'Please enter a valid email address';
    }

    // Violation description length
    if (formData.violationDescription.length > 1000) {
      newErrors.violationDescription = 'Violation description must be 1000 characters or less';
    }

    // Location length
    if (formData.location.length > 100) {
      newErrors.location = 'Location must be 100 characters or less';
    }

    // Reporter name length
    if (formData.reporterName.length > 255) {
      newErrors.reporterName = 'Reporter name must be 255 characters or less';
    }

    // Reporter school length
    if (formData.reporterSchool.length > 255) {
      newErrors.reporterSchool = 'Reporter school must be 255 characters or less';
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
      // Prepare file data
      const files: { name: string; type: string; size: number; data: string }[] = [];

      for (const file of selectedFiles) {
        try {
          const base64Data = await convertFileToBase64(file);
          files.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data
          });
        } catch (fileError) {
          console.error('Error processing file:', file.name, fileError);
          setErrors({ files: `Failed to process file: ${file.name}` });
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare submission data
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

      // Submit report
      const response = await apiClient.submitReport(submissionData);

      if (response.success) {
        setSubmitSuccess(true);
        // Redirect to success page or show success message
        setTimeout(() => {
          navigate('/reports');
        }, 2000);
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
      <div className="text-center py-8 md:py-12 px-4">
        <div className="text-4xl md:text-6xl mb-4">✅</div>
        <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-4">
          Report Submitted Successfully!
        </h2>
        <p className="text-gray-600 mb-6 text-sm md:text-base">
          Thank you for helping protect consumers by reporting this unlicensed driving school.
          Your report has been submitted and will be reviewed by our compliance team.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to reports page...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Report an Unlicensed Driving School
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* School Name - Required */}
          <div>
            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
              School Name *
            </label>
            <input
              type="text"
              id="schoolName"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.schoolName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., ABC Driving School"
              maxLength={255}
            />
            {errors.schoolName && (
              <p className="mt-1 text-sm text-red-600">{errors.schoolName}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location (Town/City)
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.location ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Newark, NJ"
              maxLength={100}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Violation Description */}
          <div>
            <label htmlFor="violationDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Violation Description
            </label>
            <textarea
              id="violationDescription"
              name="violationDescription"
              value={formData.violationDescription}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.violationDescription ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe the violation or issue you observed..."
              maxLength={1000}
            />
            <div className="flex justify-between mt-1">
              {errors.violationDescription && (
                <p className="text-sm text-red-600">{errors.violationDescription}</p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.violationDescription.length}/1000
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                School's Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+1-555-123-4567"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Website/Social Media URL
              </label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.websiteUrl ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="https://example.com"
              />
              {errors.websiteUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.websiteUrl}</p>
              )}
            </div>
          </div>

          {/* Reporter Information (Optional) */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reporter Information (Optional)</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you'd like to provide your contact information for follow-up purposes, please fill out the fields below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reporterName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="reporterName"
                  name="reporterName"
                  value={formData.reporterName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.reporterName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                  maxLength={255}
                />
                {errors.reporterName && (
                  <p className="mt-1 text-sm text-red-600">{errors.reporterName}</p>
                )}
              </div>

              <div>
                <label htmlFor="reporterPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  id="reporterPhone"
                  name="reporterPhone"
                  value={formData.reporterPhone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.reporterPhone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+1-555-987-6543"
                />
                {errors.reporterPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.reporterPhone}</p>
                )}
              </div>

              <div>
                <label htmlFor="reporterSchool" className="block text-sm font-medium text-gray-700 mb-2">
                  Your School/Organization
                </label>
                <input
                  type="text"
                  id="reporterSchool"
                  name="reporterSchool"
                  value={formData.reporterSchool}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.reporterSchool ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="XYZ High School"
                  maxLength={255}
                />
                {errors.reporterSchool && (
                  <p className="mt-1 text-sm text-red-600">{errors.reporterSchool}</p>
                )}
              </div>

              <div>
                <label htmlFor="reporterEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email Address
                </label>
                <input
                  type="email"
                  id="reporterEmail"
                  name="reporterEmail"
                  value={formData.reporterEmail}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.reporterEmail ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="john.doe@example.com"
                  maxLength={255}
                />
                {errors.reporterEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.reporterEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Files (Optional)
            </label>
            <FileUpload
              onFilesChange={handleFilesChange}
              maxFiles={10}
            />
            {errors.files && (
              <p className="mt-2 text-sm text-red-600">{errors.files}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 sm:space-y-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 order-2 sm:order-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        {/* Privacy Notice */}
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Privacy Notice</h3>
          <p className="text-sm text-gray-600">
            Your report will be reviewed by NJDSC compliance staff. Contact information is optional
            and will only be used for follow-up purposes related to this report.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportForm;