# ReportDetailsCard Component Usage

## Overview
The `ReportDetailsCard` component displays report information in a clean, read-only format optimized for page layout with responsive multi-column support.

## Usage Example

```tsx
import React from 'react';
import ReportDetailsCard from './components/ReportDetailsCard';
import { Report } from './types';

const MyComponent = () => {
  const sampleReport: Report = {
    id: 'rep_123',
    schoolName: 'ABC Driving School',
    location: 'Newark, NJ',
    violationDescription: 'Operating without proper license',
    phoneNumber: '+1-555-123-4567',
    websiteUrl: 'https://www.abc-driving.com',
    uploadedFiles: [
      {
        id: 'file-1',
        name: 'license-photo.jpg',
        type: 'image/jpeg',
        size: 1024000,
        url: 'https://example.com/license-photo.jpg'
      }
    ],
    status: 'Added',
    lastReported: '2024-01-15T10:30:00.000Z',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z'
  };

  return (
    <div>
      <ReportDetailsCard report={sampleReport} />
    </div>
  );
};
```

## Features

- **Multi-column responsive layout** optimized for space efficiency
- **Small screens**: 2-column table format (label + value)
- **Medium+ screens**: 3-column grid format for maximum data density
- **Minimal spacing** with `py-0.5` vertical padding for compact display
- **No borders** for clean page presentation
- **Automatic date formatting** (MM/DD/YYYY)
- **Clickable website links** with proper security attributes
- **Graceful handling** of missing data (shows "N/A" or "No files uploaded")
- **Enhanced data density** on larger screens
- **Responsive design** with appropriate layouts for each screen size

## Layout Behavior

### Small Screens (< md: 768px)
- **2-column table** with label and value columns
- Label: 30% width, Value: 70% width
- Standard spacing with `py-1` padding
- Horizontal scroll for long content

### Medium+ Screens (≥ md: 768px)
- **3-column grid** for maximum data density
- Compact field format: "Label: Value"
- Minimal spacing with `py-0.5` padding
- `gap-x-6` horizontal spacing, `gap-y-1` vertical spacing
- Better space utilization for print/PDF output

## Fields Displayed

1. **School Name** - School/business name
2. **Status** - Current report status
3. **Reason** - Violation description
4. **Location** - School location
5. **Phone** - Contact phone number
6. **Website** - Website/Social media links (clickable)
7. **Files** - First uploaded file name
8. **Added** - Date when status was added (MM/DD/YYYY)
9. **Last Reported** - Date of last report (MM/DD/YYYY)
10. **Created** - Date when report was created (MM/DD/YYYY)

## Styling

- **Container**: `max-w-6xl` for wide display on large screens
- **Small screens**: Table with `border-collapse` and `table-fixed`
- **Large screens**: CSS Grid with `grid-cols-3`
- **Text**: `text-xs` for compact, readable text
- **Colors**: Uses design system colors (`dim-gray`, `gray-900`)
- **Links**: Blue with hover effects and proper security attributes
- **Wrapping**: `break-words` for long content handling

## Benefits

- **Space Efficient**: 3-column layout on large screens maximizes data density
- **Print Friendly**: No borders and minimal spacing for clean printing
- **Mobile Responsive**: Table layout on small screens maintains readability
- **Professional**: Clean, organized appearance suitable for reports and documentation