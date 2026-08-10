class VaultService {
  getVaultStructure() {
    return {
      name: 'AI_Brain_OS',
      directories: [
        'Wiki/',
        'Raw/',
        'Memory/',
        'Projects/',
        'Workflow/',
        'Prompts/',
        'Templates/',
        'Daily/',
        'Meetings/',
        'Assets/'
      ]
    };
  }
}

module.exports = new VaultService();
