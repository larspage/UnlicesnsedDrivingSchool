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

// Setup React Testing Library
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
});