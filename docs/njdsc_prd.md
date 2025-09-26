# Product Requirements Document (PRD)
## NJDSC School Compliance Portal
**Website: unlicenseddrivingschoolnj.com**

### 1. Executive Summary

The NJDSC School Compliance Portal (unlicenseddrivingschoolnj.com) is a web-based platform that enables community members to report potentially unlicensed driving schools in New Jersey. The system automates data enrichment, manages compliance tracking, and facilitates communication with regulatory authorities.

### 2. Product Overview

**Product Name:** NJDSC School Compliance Portal  
**Website URL:** unlicenseddrivingschoolnj.com  
**Version:** 1.0 (MVP)  
**Platform:** Web Application  
**Primary Users:** General Public, NJDSC Administrators  

### 3. User Stories & Requirements

#### 3.1 General User Stories
- **US-001:** As a community member, I want to report a potentially unlicensed driving school so that public safety is maintained
- **US-002:** As a user, I want to upload photos/videos as evidence so that reports are well-documented
- **US-003:** As a user, I want to view existing reports so that I can see what schools have already been reported
- **US-004:** As a user, I want to switch between card and table views so that I can consume information in my preferred format

#### 3.2 Administrator User Stories
- **US-005:** As an admin, I want to update report statuses so that I can track investigation progress
- **US-006:** As an admin, I want to send reports to NJ MVC so that regulatory action can be taken
- **US-007:** As an admin, I want to configure email settings so that communications are properly formatted
- **US-008:** As an admin, I want to manage system configurations so that the portal operates according to NJDSC policies

### 4. Functional Requirements

#### 4.1 Report Submission System
- **FR-001:** System shall accept driving school reports with the following fields:
  - School Name (Required, String, max 255 chars)
  - File Upload (Optional, Multiple files, Images/Videos, max 10MB per file)
  - Violation Description (Optional, Text, max 1000 chars)
  - Phone Number (Optional, String, validated format)
  - Website/Social Media Link (Optional, URL, validated format)

#### 4.2 Data Processing & Enrichment
- **FR-002:** System shall store all submissions in Google Sheets within NJDSC workspace
- **FR-003:** System shall check for duplicate entries based on school name (case-insensitive)
- **FR-004:** For unique entries, system shall:
  - Execute automated social media search (Facebook, Instagram, LinkedIn)
  - Perform Google search for additional school information
  - Set status to "Added"
  - Set "Last Reported" date to current timestamp
- **FR-005:** For duplicate entries, system shall:
  - Append missing information to existing record
  - Add new files to existing file collection
  - Update "Last Reported" date to current timestamp

#### 4.3 Data Display System
- **FR-006:** System shall provide two view modes:
  - **Card View:** Image thumbnail, school name, status, last reported date
  - **Table View:** All fields in tabular format with sortable columns
- **FR-007:** System shall implement hover/click functionality for media preview
- **FR-008:** System shall display status update controls for administrators only
- **FR-009:** System shall provide "Send to MVC" functionality for administrators

#### 4.4 Administrative Functions
- **FR-010:** System shall provide email composition with configurable templates
- **FR-011:** System shall support the following status values:
  - "Added" (default)
  - "Confirmed by NJDSC"
  - "Reported to MVC"
  - "Under Investigation"
  - "Closed"
- **FR-012:** System shall provide administrative configuration panel for:
  - Email settings (to, from, reply-to addresses)
  - Email templates with variable substitution
  - System-wide settings

#### 4.5 Authentication & Authorization
- **FR-013:** System shall implement role-based access control with two roles:
  - General User (report submission, view reports)
  - Administrator (all general user functions + status updates + configuration)
- **FR-014:** MVP shall include role switching mechanism via header link
- **FR-015:** System shall investigate integration with existing NJDSC.org authentication

#### 4.6 Website Integration & Branding
- **FR-016:** System shall display clear NJDSC branding and contact information
- **FR-017:** System shall provide navigation link to NJDSC.org main website
- **FR-018:** System shall handle both direct traffic to unlicenseddrivingschoolnj.com and redirects from NJDSC.org
- **FR-019:** System shall include proper meta tags and SEO optimization for the domain

### 5. Technical Requirements

#### 5.1 Technology Stack
- **Frontend:** React.js with modern hooks and functional components
- **Backend:** Node.js with Express.js framework
- **Database:** Google Sheets API integration
- **File Storage:** Google Drive API
- **Email Service:** Gmail API
- **Authentication:** Auth0 or Firebase Auth (pending NJDSC integration analysis)
- **Testing:** Jest for unit testing, React Testing Library for component testing
- **Build Tools:** Vite or Create React App
- **Deployment:** TBD (Vercel, Netlify, or custom hosting)
- **Domain:** unlicenseddrivingschoolnj.com (DNS configuration required)

#### 5.2 Architecture Principles
- **Test-Driven Development (TDD):** All features developed with tests first
- **SOLID Principles:** Maintainable, extensible code architecture
- **DRY (Don't Repeat Yourself):** Reusable components and utilities
- **Responsive Design:** Mobile-first approach
- **API-First Design:** RESTful API structure
- **Security:** Input validation, authentication, authorization
- **Performance:** Lazy loading, pagination, optimized media handling

#### 5.3 Integration Requirements
- **Google Workspace APIs:**
  - Google Sheets API for data storage
  - Google Drive API for file management
  - Gmail API for email sending
- **Search APIs:**
  - Google Custom Search API for web searches
  - Social Media APIs (Facebook Graph API, Instagram Basic Display API)
- **External Services:**
  - Image/video processing for thumbnails
  - File type validation and sanitization

### 6. Non-Functional Requirements

#### 6.1 Performance
- **NFR-001:** Page load time < 3 seconds on 3G connection
- **NFR-002:** File upload progress indication for files > 1MB
- **NFR-003:** Pagination for tables with > 50 records

#### 6.2 Security
- **NFR-004:** All file uploads scanned for malware
- **NFR-005:** Input validation and sanitization for all user inputs
- **NFR-006:** HTTPS enforcement for all communications
- **NFR-007:** Rate limiting for form submissions (max 5 per hour per IP)

#### 6.3 Reliability
- **NFR-008:** 99.5% uptime target
- **NFR-009:** Graceful error handling with user-friendly messages
- **NFR-010:** Data backup and recovery procedures

#### 6.4 Usability
- **NFR-011:** Mobile-responsive design (iOS Safari, Android Chrome)
- **NFR-012:** WCAG 2.1 AA accessibility compliance
- **NFR-013:** Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

### 7. Data Model

#### 7.1 School Report Schema (Google Sheets)
```
- ID (Auto-generated)
- School Name (String, Required)
- Violation Description (Text)
- Phone Number (String)
- Website/Social Media Link (URL)
- Uploaded Files (Array of URLs)
- Social Media Links (Array of URLs, Auto-populated)
- Additional Info (Text, Auto-populated)
- Status (Enum)
- Last Reported Date (DateTime)
- Created Date (DateTime)
- Reporter IP (String, for rate limiting)
```

#### 7.2 Configuration Schema
```
- Email Settings
  - To Address (Default: mvc.blsdrivingschools@mvc.nj.gov)
  - From Address (Default: treasurer@njdsc.org)
  - Reply-To Address (Default: treasurer@njdsc.org)
  - Subject Template (Default: "Unlicensed driving school [[School Name]]")
  - Body Template (Configurable with variable substitution)
```

### 8. API Specifications

#### 8.1 Report Endpoints
- `POST /api/reports` - Submit new report
- `GET /api/reports` - Retrieve reports (with pagination, filtering)
- `PUT /api/reports/:id/status` - Update report status (Admin only)
- `POST /api/reports/:id/send-mvc` - Send report to MVC (Admin only)

#### 8.2 File Endpoints
- `POST /api/files/upload` - Upload media files
- `GET /api/files/:id` - Retrieve file metadata/URL

#### 8.3 Configuration Endpoints
- `GET /api/config` - Retrieve system configuration (Admin only)
- `PUT /api/config` - Update system configuration (Admin only)

### 9. Domain & SEO Considerations

#### 9.1 Domain Setup
- **Primary Domain:** unlicenseddrivingschoolnj.com
- **SSL Certificate:** Required for HTTPS
- **DNS Configuration:** A records pointing to hosting infrastructure
- **CDN Setup:** For optimal performance across New Jersey

#### 9.2 SEO Optimization
- **Meta Tags:** Optimized for "unlicensed driving school NJ" searches
- **Schema Markup:** Local business and government service markup
- **Sitemap:** XML sitemap for search engine indexing
- **Analytics:** Google Analytics integration for traffic monitoring

### 10. Testing Strategy

#### 10.1 Unit Testing
- All utility functions and business logic
- React component rendering and user interactions
- API endpoint functionality
- Data validation and transformation

#### 10.2 Integration Testing
- Google APIs integration
- Email sending functionality
- File upload and storage
- Authentication flows

#### 10.3 End-to-End Testing
- Complete user workflows
- Admin functionality
- Cross-browser compatibility

### 11. Deployment & Operations

#### 11.1 Environment Setup
- Development environment with mock Google APIs
- Staging environment with limited Google API access
- Production environment with full Google Workspace integration

#### 11.2 Monitoring & Analytics
- Error tracking and reporting
- Performance monitoring
- Usage analytics (privacy-compliant)

### 12. Future Enhancements (Post-MVP)

- **Phase 2:** Advanced search and filtering capabilities
- **Phase 3:** Automated NJDSC license verification integration
- **Phase 4:** Mobile application development
- **Phase 5:** Advanced reporting and analytics dashboard
- **Phase 6:** Integration with additional state regulatory systems

### 13. Success Metrics

- Number of reports submitted per month
- Time from report to MVC submission
- User engagement and return rates
- Administrator efficiency in processing reports
- Reduction in unlicensed driving school operations (long-term)
- SEO performance for target keywords

---

**Document Version:** 1.1  
**Website:** unlicenseddrivingschoolnj.com  
**Last Updated:** September 26, 2025  
**Next Review:** October 15, 2025