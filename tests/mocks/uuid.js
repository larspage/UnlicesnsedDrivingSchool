const { createId } = require('@paralleldrive/cuid2');

module.exports = {
  v4: createId,
  createId: createId,
  // Add other exports if needed for compatibility
};
