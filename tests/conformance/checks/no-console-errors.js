/**
 * Conformance Check: No Console or Page Errors
 */

export default {
  id: 'no-console-errors',
  appliesTo: () => true,
  requires: ['viewport'],
  async run(page, params = {}) {
    const errors = params.errors || [];
    return {
      status: errors.length === 0 ? 'pass' : 'fail',
      evidence: {
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    };
  }
};
