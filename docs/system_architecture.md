# NJDSC School Compliance Portal - System Architecture

## 1. System Overview

The NJDSC School Compliance Portal is a web-based platform that enables community members to report potentially unlicensed driving schools in New Jersey. The system automates data enrichment, manages compliance tracking, and facilitates communication with regulatory authorities.

### 1.1 Core Functionality
- Public report submission with file uploads
- Automated data enrichment via social media and web searches
- Dual-view data display (card/table) for administrators and public
- Administrative status management and MVC reporting
- Configurable email templates and system settings

### 1.2 Architecture Principles
- **Modular Design:** Components designed for parallel development by AI agents
- **API-First:** RESTful API architecture enabling frontend/backend decoupling
- **Configuration-Driven:** All external integrations (Google APIs) admin-configurable
- **Security-First:** Input validation, authentication, and authorization at all layers
- **Performance-Optimized:** Lazy loading, pagination, and efficient media handling

## 2. Technology Stack

### 2.1 Frontend Layer
- **Framework:** React.js 18+ with TypeScript
- **Routing:** React Router v6
- **State Management:** React Context API + custom hooks
- **Styling:** Tailwind CSS for responsive design
- **Forms:** React Hook Form with validation
- **Testing:** Jest + React Testing Library
- **Build Tool:** Vite
- **Package Manager:** npm

### 2.2 Backend Layer
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Authentication:** Auth0 or Firebase Auth (configurable)
- **Validation:** Joi or express-validator
- **Testing:** Jest + Supertest
- **Process Management:** PM2 for production

### 2.3 Data Layer
- **Primary Database:** Local JSON file storage on DigitalOcean droplet
- **File Storage:** Local directory storage on DigitalOcean droplet (publicly accessible)
- **Email Service:** Gmail API (admin-configurable)
- **Search Services:** Google Custom Search API, Facebook Graph API, Instagram API

### 2.4 Infrastructure
- **Hosting:** DigitalOcean Droplet (cost-effective VPS hosting)
- **Domain:** unlicenseddrivingschoolnj.com
- **SSL:** HTTPS enforcement via Let's Encrypt
- **CDN:** Cloudflare (optional for static assets)
- **Monitoring:** Google Analytics, error tracking (Sentry)

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  React Application                                          │ │
│  │  ├── Public Routes (/report, /reports)                      │ │
│  │  ├── Admin Routes (/admin/*) - Auth Protected               │ │
│  │  ├── Components: ReportForm, ReportList, AdminPanel         │ │
│  │  └── Services: API client, File upload, Auth                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Layer (Node.js/Express)           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  REST API Endpoints                                         │ │
│  │  ├── POST /api/reports - Submit report                      │ │
│  │  ├── GET /api/reports - List reports (paginated)            │ │
│  │  ├── PUT /api/reports/:id/status - Update status (admin)    │ │
│  │  ├── POST /api/files/upload - File upload                   │ │
│  │  └── GET/PUT /api/config - Admin configuration              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Business Logic Services                                    │ │
│  │  ├── ReportService - CRUD operations                        │ │
│  │  ├── EnrichmentService - Auto-research                      │ │
│  │  ├── FileService - Upload/storage                           │ │
│  │  ├── EmailService - MVC notifications                       │ │
│  │  └── ConfigService - System configuration                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Local Storage + APIs
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Data Layer (DigitalOcean Droplet)               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Local JSON Files - Primary data store                      │ │
│  │  ├── reports.json - All report data                         │ │
│  │  ├── config.json - System configuration                     │ │
│  │  └── audit.json - Admin action logs                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Local File System - Image storage                          │ │
│  │  ├── /var/www/uploads/ directory                            │ │
│  │  ├── Public web access via Nginx                            │ │
│  │  └── Organized subdirectories by report ID                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  External Integrations                                       │ │
│  │  ├── Gmail API - Email sending                              │ │
│  │  ├── Google Search API - Data enrichment                    │ │
│  │  └── Social Media APIs - Link discovery                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Component Architecture

### 4.1 Frontend Components

#### Core Components
- **App.tsx** - Main application component with routing
- **Layout.tsx** - Common layout with header/footer and NJDSC branding
- **AuthProvider.tsx** - Authentication context provider

#### Public Components
- **ReportForm.tsx** - Multi-step form for report submission
- **ReportList.tsx** - Dual-view component (cards/table)
- **ReportCard.tsx** - Individual report display card
- **ReportTable.tsx** - Sortable table view with pagination

#### Admin Components
- **AdminPanel.tsx** - Main admin dashboard
- **StatusUpdateModal.tsx** - Status change interface
- **EmailComposer.tsx** - MVC email composition
- **ConfigPanel.tsx** - System configuration interface

#### Shared Components
- **FileUpload.tsx** - Drag-and-drop file upload
- **LoadingSpinner.tsx** - Loading states
- **ErrorBoundary.tsx** - Error handling
- **Modal.tsx** - Reusable modal component

### 4.2 Backend Services

#### API Layer
- **routes/reports.js** - Report CRUD endpoints
- **routes/files.js** - File upload endpoints
- **routes/config.js** - Configuration endpoints
- **middleware/auth.js** - Authentication middleware
- **middleware/validation.js** - Request validation

#### Service Layer
- **services/localJsonService.js** - Local JSON file storage operations
- **services/fileService.js** - Local file system management
- **services/GmailService.js** - Email API wrapper (retained)
- **services/EnrichmentService.js** - Data enrichment logic
- **services/ValidationService.js** - Data validation utilities

#### Utility Layer
- **utils/fileProcessing.js** - File handling utilities
- **utils/dataTransformation.js** - Data mapping functions
- **utils/rateLimiting.js** - Rate limiting logic
- **utils/security.js** - Security utilities

## 5. Data Flow Architecture

### 5.1 Report Submission Flow
1. User fills ReportForm component
2. Form validation (client-side)
3. File upload to `/api/files/upload`
4. Form submission to `/api/reports`
5. Server validation and duplicate check
6. Data enrichment (background job)
7. Response with success/error

### 5.2 Data Enrichment Flow
1. New report triggers enrichment job
2. Parallel API calls to search services
3. Result aggregation and deduplication
4. Update report in local JSON file with enriched data
5. Status update to "Added"

### 5.3 Admin Status Update Flow
1. Admin selects report in ReportList
2. StatusUpdateModal opens
3. Status change submitted to `/api/reports/:id/status`
4. Local JSON file update
5. Optional email notification to MVC

## 6. Security Architecture

### 6.1 Authentication & Authorization
- Role-based access control (Public/Admin)
- JWT tokens for session management
- Admin-only routes protected by middleware
- Future integration with NJDSC.org authentication

### 6.2 Data Security
- Input sanitization and validation
- File type and size restrictions
- Rate limiting (5 submissions/hour per IP)
- HTTPS enforcement
- Secure credential storage for Google APIs

### 6.3 API Security
- CORS configuration
- Request size limits
- SQL injection prevention (though using Sheets API)
- XSS protection in React components

## 7. Scalability Considerations

### 7.1 Performance Optimization
- Lazy loading for React components
- Image optimization and compression
- Pagination for large datasets
- Caching strategies for API responses
- CDN for static assets

### 7.2 Monitoring & Analytics
- Error tracking with Sentry
- Performance monitoring
- Google Analytics for user behavior
- API usage monitoring
- Automated alerts for system issues

### 7.3 Future Scaling
- Microservices architecture preparation
- Database migration path (Sheets → PostgreSQL)
- Horizontal scaling capabilities
- Advanced caching (Redis)
- Load balancing considerations

## 8. Deployment Architecture

### 8.1 Environment Strategy
- **Development:** Local development with local JSON files and file storage
- **Staging:** Production-like environment on DigitalOcean droplet with test data
- **Production:** Full production deployment on DigitalOcean droplet with live data

### 8.2 CI/CD Pipeline
- Automated testing on commits
- Staging deployment on feature branches
- Production deployment via pull requests
- Rollback capabilities
- Environment-specific configurations

### 8.3 Backup & Recovery
- Automated JSON file backups to DigitalOcean Spaces or external storage
- File system snapshots and incremental backups
- Configuration file versioning
- Disaster recovery with droplet snapshots and data restoration

## 9. Implementation Status

### Phase 1: Infrastructure & Foundation Setup ✅ COMPLETED
**Completion Date:** September 26, 2025

#### ✅ Completed Components:
- **Project Structure:** Full folder hierarchy established (src/, server/, tests/, docs/)
- **Frontend Stack:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend Stack:** Node.js 18 + Express.js with security middleware
- **Build Tools:** ESLint, Prettier, Jest testing framework configured
- **Development Environment:** Hot reload, concurrent dev servers, environment configs
- **Version Control:** Git repository initialized with comprehensive .gitignore
- **CI/CD Pipeline:** GitHub Actions workflow for automated testing and security checks
- **Code Quality:** Linting, formatting, and testing standards established
### Phase 2: Data Layer & Local Storage ✅ COMPLETED

**Completed:** October 3, 2025 - Local storage implementation fully operational

#### ✅ Completed Components:
- **Local JSON Storage:** File-based data persistence with CRUD operations
- **Local File System:** Directory structure for image storage with proper permissions
- **Nginx Configuration:** Public file serving with security headers
- **Data Models:** JSON schema validation and data transformation
- **Gmail API:** Email service framework retained for MVC notifications
- **File Upload System:** Complete local file storage with validation

### Phase 3: Backend API Development ✅ COMPLETED
**Completion Date:** September 30, 2025

#### ✅ Completed Components:
- **Reports API:** Full REST API with GET, POST, PUT endpoints and comprehensive validation
- **Files API:** Complete file upload system with Google Drive integration
- **Configuration API:** Admin-configurable system settings
- **Authentication:** Basic auth system with role-based access
- **Security Middleware:** Rate limiting, input validation, CORS configuration

### Phase 4: Frontend Foundation & Components ✅ COMPLETED
**Completion Date:** September 30, 2025

#### ✅ Completed Components:
- **React Application:** Full TypeScript implementation with routing
- **Component Library:** ReportForm, FileUpload, ReportList with responsive design
- **State Management:** React Context and custom hooks for data management
- **UI Framework:** Tailwind CSS with consistent design system
- **Admin Interface:** Working overview dashboard with real-time data

### Phase 5: Core User Features ✅ COMPLETED
**Completion Date:** September 30, 2025

#### ✅ Completed Components:
- **Report Submission:** End-to-end working with file uploads and validation
- **Report Viewing:** Card/table views with search, filtering, and pagination
- **File Management:** Drag-and-drop uploads with Google Drive storage
- **Admin Dashboard:** Real-time overview with statistics from Google Sheets (9 reports loaded)
- **Data Integration:** Live connection to "Reports" sheet in Google Sheets

#### 🔄 Next Phase: Admin Features & Production Deployment
- Enhanced admin dashboard with status management
- Email composition and MVC notifications
- Audit logging and compliance tracking
- Production deployment and monitoring

---

**Document Version:** 1.4
**Last Updated:** October 3, 2025
**Next Review:** October 15, 2025