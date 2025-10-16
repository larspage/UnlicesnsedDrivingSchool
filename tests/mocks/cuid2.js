// Mock for @paralleldrive/cuid2 to handle compatibility issues with formidable
const { createId } = require('@paralleldrive/cuid2');

module.exports = {
  createId: createId,
  init: () => ({
    createId: createId
  }),
  // Export other functions if needed
  default: createId
};