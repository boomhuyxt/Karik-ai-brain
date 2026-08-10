class ProgressService {
  constructor() {
    this.tasks = [
      { id: 1, name: 'Phân tích Data', progress: 78, status: 'running', color: 'primary' },
      { id: 2, name: 'Đồng bộ Node', progress: 42, status: 'running', color: 'secondary' },
      { id: 3, name: 'Mã hóa bảo mật', progress: 95, status: 'completed', color: 'success' }
    ];
  }

  getTasks() {
    return {
      executionTime: new Date().toLocaleTimeString('vi-VN'),
      tasks: this.tasks
    };
  }

  updateProgress(taskId, progress) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.progress = progress;
      if (progress >= 100) task.status = 'completed';
    }
    return this.tasks;
  }
}

module.exports = new ProgressService();
