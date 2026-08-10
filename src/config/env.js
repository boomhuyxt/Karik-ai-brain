require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  github: {
    token: process.env.GITHUB_PAT || '',
    owner: process.env.GITHUB_OWNER || 'boomhuyxt',
    repo: process.env.GITHUB_REPO || 'Obsidian-JarVis-Ai'
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://blrimwahpwfqewfmmtet.supabase.co',
    key: process.env.SUPABASE_KEY || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
    jwksUrl: process.env.SUPABASE_JWKS_URL || ''
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || ''
  }
};
