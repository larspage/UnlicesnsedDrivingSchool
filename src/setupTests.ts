// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch for tests
global.fetch = jest.fn();

// Mock authService for tests
jest.mock('./services/authService', () => ({
  default: class MockAuthService {
    static getInstance = jest.fn(() => ({
      getAuthToken: jest.fn(),
      isAuthenticated: jest.fn(() => true),
      getCurrentUser: jest.fn(() => ({ id: '1', username: 'test', role: 'admin' })),
    })) as any;
  },
}));

// Mock FileReader for tests to avoid act() warnings
(global as any).FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: function(file: any) {
    // Check if file is a valid File object (has required properties)
    if (!file || typeof file !== 'object' || !file.name || !file.type || typeof file.size !== 'number') {
      // Invalid file - call onerror
      setTimeout(() => {
        if (this.onerror) {
          this.onerror(new Error('Invalid file'));
        }
      }, 0);
      return;
    }

    // Valid file - simulate synchronous onload
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,test';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  },
  onload: null,
  onerror: null,
  result: null
}));

// Setup React Testing Library
// Setup React Testing Library
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
});