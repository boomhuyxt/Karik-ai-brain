const workflowService = require('../services/workflow/workflow.service');

class WorkflowController {
  async getWorkflows(req, res, next) {
    try {
      const list = workflowService.getWorkflows();
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WorkflowController();
