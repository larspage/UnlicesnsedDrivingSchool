import React, { useState, useRef, useEffect } from 'react';
import { Report } from '../types';
import ReportDetailsCard from './ReportDetailsCard';

interface ReportSummaryCardProps {
  report: Report;
}

const ReportSummaryCard: React.FC<ReportSummaryCardProps> = ({ report }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Function to calculate safe popup position within viewport
  const calculateSafePosition = (cursorX: number, cursorY: number) => {
    const popupWidth = 384; // w-96 = 384px
    const popupHeight = 300; // Approximate height
    const offset = 20; // Distance from cursor
    const margin = 10; // Minimum margin from screen edges

    let x = cursorX + offset;
    let y = cursorY + offset;

    // Check right edge
    if (x + popupWidth + margin > window.innerWidth) {
      x = cursorX - popupWidth - offset; // Place to the left
    }

    // Check bottom edge
    if (y + popupHeight + margin > window.innerHeight) {
      y = cursorY - popupHeight - offset; // Place above cursor
    }

    // Ensure minimum margins from edges
    x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - popupHeight - margin));

    return { x, y };
  };

  // Add hover handlers with refined timing - 1 second hover delay, 0.5 second transition
  const handleMouseEnter = (e: React.MouseEvent) => {
    const newPosition = { x: e.clientX, y: e.clientY };
    setMousePosition(newPosition);
    setPopupPosition(calculateSafePosition(newPosition.x, newPosition.y));
    setTimeout(() => setIsHovered(true), 1000); // 1 second hover delay
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const newPosition = { x: e.clientX, y: e.clientY };
    setMousePosition(newPosition);
    setPopupPosition(calculateSafePosition(newPosition.x, newPosition.y));
  };

  const handleMouseLeave = () => {
    setTimeout(() => setIsHovered(false), 1000); // 1 second hide delay
  };

  // Truncate violation description to 50 characters for summary view
  const truncateDescription = (description: string): string => {
    if (!description) return 'No description';
    return description.length > 50 ? description.substring(0, 50) + '...' : description;
  };

  // Get the most current picture - prioritize uploadedFiles, then sample photos, then placeholder
  const getCurrentImage = (): string => {
    // If report has uploaded files, use the first one
    if (report.uploadedFiles && report.uploadedFiles.length > 0) {
      return report.uploadedFiles[0].thumbnailUrl || report.uploadedFiles[0].url;
    }
    
    // Use sample photos based on report ID for variety
    const sampleImages = ['/samplePhotos/school1.jpg', '/samplePhotos/school2.jpg', '/samplePhotos/school3.jpg'];
    const hash = report.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return sampleImages[Math.abs(hash) % sampleImages.length];
  };

  // Update position on window resize
  useEffect(() => {
    if (isHovered) {
      setPopupPosition(calculateSafePosition(mousePosition.x, mousePosition.y));
    }
  }, [isHovered, mousePosition]);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Card */}
      <div
        className="w-full bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border border-gray-200 text-left"
        data-testid="report-summary-card"
        title="" // Clear any existing tooltips
      >
        <div className="flex items-start space-x-3">
          {/* Image on the left */}
          <div className="flex-shrink-0">
            <img
              src={getCurrentImage()}
              alt={report.schoolName}
              className="w-16 h-16 object-cover rounded-lg border border-gray-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/samplePhotos/school1.jpg'; // Fallback image
              }}
              title="" // Clear any existing tooltips
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* School Name (bold) */}
            <h3 className="text-sm font-bold text-gray-900 mb-1 truncate" title="">
              {report.schoolName || 'Unknown School'}
            </h3>

            {/* Violation Description (max 50 chars) */}
            <p className="text-xs text-gray-600 mb-1 line-clamp-2" title="">
              {truncateDescription(report.violationDescription || '')}
            </p>

            {/* Location */}
            <p className="text-xs text-gray-500" title="">
              Seen: {report.location || 'Location not specified'}
            </p>
          </div>
        </div>
      </div>

      {/* Hover Popup - Report Details Card - Smart Screen Boundary Positioning */}
      {isHovered && (
        <div
          ref={popupRef}
          className="fixed pointer-events-auto transition-opacity duration-500 z-[9999]"
          data-testid="report-details-popup"
          style={{
            left: popupPosition.x,
            top: popupPosition.y,
            zIndex: 9999
          }}
        >
          <div className="w-96 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden">
            <ReportDetailsCard report={report} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportSummaryCard;