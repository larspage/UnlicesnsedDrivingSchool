// Mock for @paralleldrive/cuid2 to handle compatibility issues with formidable
const { createId } = require('@paralleldrive/cuid2');

function mockCreateId() {
  return 'mock_' + Math.random().toString(36).substr(2, 9);
}

module.exports = {
  createId: mockCreateId,
  init: () => ({
    createId: mockCreateId
  }),
  // Export other functions if needed
  default: mockCreateId
};