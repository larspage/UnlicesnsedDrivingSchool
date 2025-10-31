// Mock for Node.js crypto.randomUUID()
const { randomUUID } = require('crypto');

const cuid2 = {
  createId: () => randomUUID(),
  init: () => {}, // Add the missing init function
  isCuid: () => true,
  // Add other methods that might be used
};

// Also export as default and named exports
module.exports = cuid2;
module.exports.default = cuid2;
module.exports.createId = cuid2.createId;
module.exports.init = cuid2.init;
module.exports.isCuid = cuid2.isCuid;