const { supabase } = require('../config/supabase');

class ProjectRepository {
  async findAll() {
    if (!supabase) {
      return [
        { id: 'proj_1', name: 'AI Brain OS', status: 'In Progress', progress: 85 },
        { id: 'proj_2', name: 'Obsidian Graph Visualizer', status: 'Completed', progress: 100 }
      ];
    }
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    return data;
  }

  async save(project) {
    if (!supabase) return { ...project, id: project.id || 'proj_mock_1' };
    const { data, error } = await supabase.from('projects').upsert(project).select().single();
    if (error) throw error;
    return data;
  }
}

module.exports = new ProjectRepository();
