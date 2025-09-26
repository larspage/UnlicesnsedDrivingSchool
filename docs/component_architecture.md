# NJDSC School Compliance Portal - Component Architecture

## 1. Overview

This document defines the modular component architecture for the NJDSC School Compliance Portal, designed to enable parallel development by multiple AI agents. Components are organized into clear hierarchies with minimal interdependencies, allowing agents to work on different parts of the system simultaneously.

### 1.1 Architecture Principles
- **Modular Design:** Each component has a single responsibility
- **Dependency Injection:** Clear interfaces between components
- **Testability:** Each component can be unit tested independently
- **Reusability:** Shared components designed for reuse
- **Parallel Development:** Components grouped by functional areas

### 1.2 Development Workflow
- Components developed in feature branches
- Automated testing for each component
- Code review and integration testing
- Continuous integration/deployment

## 2. Frontend Component Architecture

### 2.1 Application Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API service functions
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── contexts/           # React context providers
├── styles/             # CSS and styling files
└── tests/              # Component tests
```

### 2.2 Page Components

#### App.tsx (Main Application)
**Agent:** Frontend Lead  
**Dependencies:** All page components, routing  
**Responsibilities:**
- Application routing setup
- Global context providers
- Error boundary wrapping
- Authentication state management

**Code Structure:**
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ReportPage } from './pages/ReportPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ReportPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

#### ReportPage.tsx (Public Report Submission)
**Agent:** Public Interface Agent  
**Dependencies:** ReportForm, ReportList components  
**Responsibilities:**
- Report submission interface
- Public report browsing
- View mode switching (card/table)

#### AdminPage.tsx (Administrative Dashboard)
**Agent:** Admin Interface Agent  
**Dependencies:** StatusUpdateModal, EmailComposer, ConfigPanel  
**Responsibilities:**
- Administrative functions
- Report status management
- System configuration
- MVC communication

### 2.3 Shared UI Components

#### Layout Components
**Agent:** UI Foundation Agent

##### Layout.tsx
- Header with NJDSC branding
- Navigation menu
- Footer with contact info
- Responsive design wrapper

##### Header.tsx
- NJDSC logo and branding
- Role switching toggle (MVP)
- User authentication status

##### Navigation.tsx
- Main navigation links
- Mobile-responsive menu
- Active route highlighting

#### Form Components
**Agent:** Form Specialist Agent

##### ReportForm.tsx
- Multi-step form wizard
- File upload with drag-and-drop
- Real-time validation
- Progress indicators

##### FileUpload.tsx
- Drag-and-drop zone
- File type validation
- Upload progress bars
- Preview thumbnails

##### FormField.tsx
- Reusable form input components
- Validation error display
- Accessibility features

#### Data Display Components
**Agent:** Data Visualization Agent

##### ReportList.tsx
- View mode switching (card/table)
- Pagination controls
- Search and filtering
- Sorting functionality

##### ReportCard.tsx
- Card layout for reports
- Image/video thumbnails
- Status badges
- Hover interactions

##### DataTable.tsx
- Sortable table component
- Column resizing
- Row selection (admin)
- Export functionality

#### Modal Components
**Agent:** Modal Specialist Agent

##### Modal.tsx
- Reusable modal wrapper
- Accessibility features
- Animation transitions

##### StatusUpdateModal.tsx
- Status selection dropdown
- Notes input field
- Confirmation actions

##### EmailComposer.tsx
- Email template selection
- Variable substitution preview
- Send confirmation

### 2.4 Custom Hooks

#### API Hooks
**Agent:** API Integration Agent

##### useReports.ts
```typescript
// useReports.ts
import { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';

export function useReports(filters: ReportFilters) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getReports(filters);
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  return { reports, loading, error, refetch: fetchReports };
}
```

##### useFileUpload.ts
- File upload state management
- Progress tracking
- Error handling

##### useAuth.ts
- Authentication state
- Role checking
- Login/logout functions

#### UI Hooks
**Agent:** UI Logic Agent

##### useViewMode.ts
- Card/table view switching
- Local storage persistence
- URL state synchronization

##### usePagination.ts
- Page state management
- Navigation functions
- Item count calculations

##### useSearch.ts
- Search query state
- Debounced search
- Filter application

### 2.5 Service Layer

#### API Services
**Agent:** Backend Integration Agent

##### reportService.ts
```typescript
// reportService.ts
import { apiClient } from './apiClient';

export const reportService = {
  async submitReport(data: ReportSubmission): Promise<Report> {
    const response = await apiClient.post('/api/reports', data);
    return response.data;
  },

  async getReports(filters: ReportFilters): Promise<Report[]> {
    const response = await apiClient.get('/api/reports', { params: filters });
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await apiClient.put(`/api/reports/${id}/status`, { status });
  }
};
```

##### fileService.ts
- File upload functions
- File metadata retrieval
- Thumbnail URL generation

##### configService.ts
- Configuration retrieval
- Configuration updates
- Cache management

#### Utility Services
**Agent:** Utility Agent

##### validationService.ts
- Form validation functions
- Data sanitization
- Type checking

##### formatService.ts
- Date formatting
- Phone number formatting
- URL normalization

## 3. Backend Component Architecture

### 3.1 Application Structure
```
server/
├── routes/              # API route handlers
├── services/            # Business logic services
├── models/              # Data models and schemas
├── middleware/          # Express middleware
├── utils/               # Utility functions
├── config/              # Configuration management
└── tests/               # Backend tests
```

### 3.2 Route Handlers

#### Report Routes
**Agent:** Report API Agent  
**File:** routes/reports.js

```javascript
// routes/reports.js
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { validateReport } = require('../middleware/validation');

router.post('/', validateReport, async (req, res) => {
  try {
    const report = await reportService.createReport(req.body, req.ip);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filters = req.query;
    const reports = await reportService.getReports(filters);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
```

#### File Routes
**Agent:** File API Agent  
**File:** routes/files.js

#### Configuration Routes
**Agent:** Config API Agent  
**File:** routes/config.js

### 3.3 Service Layer

#### Business Services
**Agent:** Business Logic Agent

##### reportService.js
- Report CRUD operations
- Duplicate detection
- Status updates
- Data enrichment coordination

##### enrichmentService.js
- Social media search
- Google search integration
- Data aggregation
- Background job processing

##### emailService.js
- Gmail API integration
- Template processing
- Email sending
- Delivery tracking

#### External API Services
**Agent:** External Integration Agent

##### googleSheetsService.js
- Sheets API wrapper
- Row operations
- Data transformation
- Error handling

##### googleDriveService.js
- File upload handling
- Permission management
- URL generation
- Folder organization

##### gmailService.js
- Email composition
- Template substitution
- Sending functionality

### 3.4 Middleware Components

#### Authentication Middleware
**Agent:** Security Agent

##### auth.js
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
```

#### Validation Middleware
**Agent:** Validation Agent

##### validation.js
- Request body validation
- File upload validation
- Rate limiting
- Input sanitization

#### Error Handling Middleware
**Agent:** Error Handling Agent

##### errorHandler.js
- Global error catching
- Error response formatting
- Logging integration

### 3.5 Model Definitions

#### Data Models
**Agent:** Data Modeling Agent

##### Report.js
```javascript
// models/Report.js
class Report {
  constructor(data) {
    this.id = data.id;
    this.schoolName = data.schoolName;
    this.violationDescription = data.violationDescription;
    this.status = data.status || 'Added';
    this.createdAt = data.createdAt || new Date();
    this.lastReported = data.lastReported || new Date();
  }

  static validate(data) {
    // Validation logic
  }

  toSheetsRow() {
    // Convert to Google Sheets format
  }

  static fromSheetsRow(row) {
    // Convert from Google Sheets format
  }
}

module.exports = Report;
```

##### File.js
- File metadata model
- Validation methods
- URL generation

##### Configuration.js
- Configuration key-value model
- Type validation
- Update tracking

## 4. Component Dependencies and Communication

### 4.1 Frontend Dependencies
```
ReportPage
├── ReportForm
│   ├── FileUpload
│   ├── FormField
│   └── useReports (hook)
├── ReportList
│   ├── ReportCard
│   ├── DataTable
│   └── useViewMode (hook)
└── useAuth (hook)
```

### 4.2 Backend Dependencies
```
routes/reports.js
├── services/reportService.js
│   ├── models/Report.js
│   ├── services/enrichmentService.js
│   └── services/googleSheetsService.js
├── middleware/validation.js
└── middleware/auth.js
```

### 4.3 Inter-Component Communication
- **Frontend:** React Context for global state, custom hooks for API calls
- **Backend:** Service injection, event emitters for background jobs
- **Frontend-Backend:** RESTful API with JSON payloads

## 5. Testing Strategy

### 5.1 Frontend Testing
- **Unit Tests:** Component rendering, hook logic
- **Integration Tests:** Component interactions, API calls
- **E2E Tests:** User workflows, form submissions

### 5.2 Backend Testing
- **Unit Tests:** Service functions, utility functions
- **Integration Tests:** API endpoints, database operations
- **Contract Tests:** External API integrations

### 5.3 Test Organization
```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   └── external/
└── e2e/
    ├── user-journeys/
    └── admin-workflows/
```

## 6. Development Parallelization

### 6.1 Agent Role Assignment
- **Frontend Lead Agent:** App structure, routing, global state
- **Public Interface Agent:** Report submission and viewing
- **Admin Interface Agent:** Administrative functions
- **API Integration Agent:** API services and hooks
- **UI Foundation Agent:** Layout and shared components
- **Data Visualization Agent:** Tables, cards, and data display
- **Backend API Agent:** Route handlers and middleware
- **Business Logic Agent:** Core services and data processing
- **External Integration Agent:** Google APIs and third-party services

### 6.2 Parallel Development Guidelines
1. Each agent works within their assigned component boundaries
2. Shared interfaces defined upfront (API contracts, component props)
3. Regular integration testing to catch dependency issues
4. Code reviews focus on component responsibilities
5. Automated testing ensures component compatibility

---

**Component Architecture Version:** 1.0
**Last Updated:** September 26, 2025
**Next Review:** October 15, 2025