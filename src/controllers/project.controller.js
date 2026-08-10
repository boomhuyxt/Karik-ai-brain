const projectRepository = require('../repositories/project.repository');

class ProjectController {
  async getProjects(req, res, next) {
    try {
      const projects = await projectRepository.findAll();
      res.json(projects);
    } catch (err) {
      next(err);
    }
  }

  async saveProject(req, res, next) {
    try {
      const result = await projectRepository.save(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectController();
