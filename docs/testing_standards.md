# NJDSC School Compliance Portal - Testing Standards & Conventions

## 1. Overview

This document establishes testing standards and conventions for the NJDSC School Compliance Portal. All code must maintain high test coverage and follow established testing patterns.

### 1.1 Testing Philosophy
- **Test-Driven Development (TDD):** Write tests before implementing features
- **Comprehensive Coverage:** Minimum 80% code coverage across all components
- **Integration First:** Test component interactions before isolated units
- **Continuous Testing:** Automated testing in CI/CD pipeline

## 2. Testing Framework

### 2.1 Frontend Testing
- **Framework:** Jest + React Testing Library
- **Environment:** jsdom for DOM simulation
- **Coverage Tool:** Istanbul (built into Jest)

### 2.2 Backend Testing
- **Framework:** Jest + Supertest
- **Environment:** Node.js
- **Coverage Tool:** Istanbul (built into Jest)

### 2.3 Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/server', '<rootDir>/tests'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    'server/**/*.{js}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 3. Test Organization

### 3.1 File Structure
```
tests/
├── unit/           # Unit tests
│   ├── components/ # React component tests
│   ├── services/   # Service layer tests
│   └── utils/      # Utility function tests
├── integration/    # Integration tests
│   ├── api/        # API endpoint tests
│   └── workflows/  # User workflow tests
└── e2e/           # End-to-end tests
    └── journeys/   # Complete user journeys
```

### 3.2 Naming Conventions
- **Test Files:** `*.test.js`, `*.test.ts`, `*.test.tsx`
- **Test Functions:** `describe('ComponentName', () => { ... })`
- **Test Cases:** `it('should do something', () => { ... })`
- **Mock Files:** `*.mock.js`, `*.mock.ts`

## 4. Testing Standards

### 4.1 Unit Tests

#### React Components
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportForm } from './ReportForm';

describe('ReportForm', () => {
  it('renders form fields correctly', () => {
    render(<ReportForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/school name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ReportForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/school name/i), 'Test School');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      schoolName: 'Test School'
    });
  });
});
```

#### Backend Services
```javascript
const request = require('supertest');
const app = require('../app');

describe('Reports API', () => {
  describe('POST /api/reports', () => {
    it('should create a new report', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test Driving School',
          violationDescription: 'No license'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.schoolName).toBe('Test Driving School');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
```

### 4.2 Integration Tests
```javascript
describe('Report Submission Workflow', () => {
  it('should handle complete report submission with file upload', async () => {
    // Mock external dependencies
    jest.mock('../services/googleSheetsService');
    jest.mock('../services/googleDriveService');

    const response = await request(app)
      .post('/api/reports')
      .send({
        schoolName: 'Test School',
        files: [/* mock file data */]
      });

    expect(response.status).toBe(201);
    // Verify Google Sheets was called
    // Verify Google Drive was called
    // Verify response format
  });
});
```

### 4.3 End-to-End Tests
```javascript
describe('Report Submission Journey', () => {
  it('should allow user to submit a complete report', () => {
    // Navigate to form
    cy.visit('/report');

    // Fill out form
    cy.get('[data-testid="school-name"]').type('Test School');
    cy.get('[data-testid="violation-description"]').type('No license');

    // Upload file
    cy.get('input[type="file"]').selectFile('test-image.jpg');

    // Submit form
    cy.get('[data-testid="submit-button"]').click();

    // Verify success
    cy.contains('Report submitted successfully').should('be.visible');
  });
});
```

## 5. Mocking & Fixtures

### 5.1 External API Mocking
```javascript
// mocks/googleApis.js
const mockGoogleSheets = {
  appendRow: jest.fn(),
  findRows: jest.fn(),
  updateRow: jest.fn()
};

const mockGoogleDrive = {
  uploadFile: jest.fn(),
  generateThumbnail: jest.fn()
};

module.exports = {
  googleSheets: mockGoogleSheets,
  googleDrive: mockGoogleDrive
};
```

### 5.2 Test Data Fixtures
```javascript
// fixtures/reports.js
const validReport = {
  schoolName: 'ABC Driving School',
  violationDescription: 'Operating without license',
  phoneNumber: '+1-555-123-4567',
  websiteUrl: 'https://abcdriving.com'
};

const invalidReport = {
  schoolName: '',
  violationDescription: 'A'.repeat(1001) // Too long
};

module.exports = {
  validReport,
  invalidReport
};
```

## 6. Code Coverage Requirements

### 6.1 Minimum Coverage Thresholds
- **Statements:** 80%
- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%

### 6.2 Coverage Exclusions
```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx,js,jsx}',
  'server/**/*.{js}',
  '!src/**/*.d.ts',
  '!src/main.tsx',
  '!src/vite-env.d.ts',
  '!server/app.js', // Covered by integration tests
]
```

## 7. Testing Best Practices

### 7.1 General Principles
- **Arrange-Act-Assert:** Structure tests clearly
- **One Assertion Per Test:** Keep tests focused
- **Descriptive Names:** Tests should read like documentation
- **Independent Tests:** No test should depend on others
- **Fast Execution:** Tests should run quickly

### 7.2 React Testing
- **Avoid Testing Implementation:** Test behavior, not internal state
- **Use data-testid:** For reliable element selection
- **Mock External Dependencies:** Isolate component logic
- **Test User Interactions:** Use userEvent for realistic interactions

### 7.3 API Testing
- **Test All Response Codes:** Success, validation errors, auth errors
- **Validate Response Schema:** Ensure API contract compliance
- **Test Rate Limiting:** Verify throttling behavior
- **Mock External Services:** Isolate API logic from external dependencies

### 7.4 Asynchronous Testing
```javascript
it('should handle async operations', async () => {
  const promise = asyncOperation();
  await expect(promise).resolves.toBe('expected result');
});

it('should handle timeouts', async () => {
  const slowOperation = () => new Promise(resolve =>
    setTimeout(() => resolve('done'), 100)
  );

  await expect(slowOperation()).resolves.toBe('done');
}, 500); // Custom timeout
```

## 8. CI/CD Integration

### 8.1 Automated Testing
```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: npm test -- --coverage --watchAll=false

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### 8.2 Quality Gates
- **Unit Tests:** Must pass for all components
- **Integration Tests:** Must validate interface compliance
- **Coverage Threshold:** Must meet minimum requirements
- **Linting:** Must pass ESLint rules
- **Type Checking:** Must pass TypeScript compilation

## 9. Implementation Status

### Phase 1: Infrastructure Setup ✅ COMPLETED
- Jest configuration established
- Test file structure created
- Basic test utilities configured
- CI/CD testing pipeline ready

### Phase 2-8: Feature Implementation
- Unit tests for each component
- Integration tests for API endpoints
- E2E tests for user workflows
- Coverage monitoring and reporting

---

**Testing Standards Version:** 1.0
**Last Updated:** September 26, 2025
**Coverage Target:** 80% minimum