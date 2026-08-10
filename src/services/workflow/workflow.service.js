class WorkflowService {
  getWorkflows() {
    return [
      { id: 'wf_1', name: 'GitHub Obsidian Auto-Sync', trigger: 'Push', status: 'Active' },
      { id: 'wf_2', name: 'RAG Embedding Generator', trigger: 'File Creation', status: 'Active' }
    ];
  }
}

module.exports = new WorkflowService();
