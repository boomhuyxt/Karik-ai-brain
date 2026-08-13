const env = require('./env');

let Octokit;
try {
  Octokit = require('@octokit/rest').Octokit;
} catch (e) {
  Octokit = null;
}

let octokit = null;

if (Octokit && env.github.token) {
  try {
    octokit = new Octokit({ auth: env.github.token });
  } catch (err) {
    console.warn('[GitHub Config] Failed to initialize Octokit:', err.message);
  }
}

module.exports = {
  octokit,
  token: env.github.token,
  get owner() { return process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt'; },
  get repo() { return process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai'; }
};
