// Mock for Node.js crypto.randomUUID()
const { randomUUID } = require('crypto');

module.exports = {
  v4: randomUUID,
  // Add other exports if needed
};
