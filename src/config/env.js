require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  github: {
    token: process.env.GITHUB_PAT || '',
    owner: process.env.GITHUB_OWNER || 'boomhuyxt',
    repo: process.env.GITHUB_REPO || 'Obsidian-Karik-Ai'
  },
  obsidianVaultPath: process.env.OBSIDIAN_VAULT_PATH || 'C:/Users/boomh/OneDrive/Documents/Jarvis Ai',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://blrimwahpwfqewfmmtet.supabase.co',
    key: process.env.SUPABASE_KEY || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
    jwksUrl: process.env.SUPABASE_JWKS_URL || ''
  },
  db: {
    host: process.env.DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres.blrimwahpwfqewfmmtet',
    password: process.env.DB_PASSWORD || 'JarvisAi@123data',
    connectionString: process.env.DATABASE_URL || ''
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiImageApiKey: process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    tokenrouterApiKey: process.env.TOKENROUTER_API_KEY || '',
    tokenrouterBaseUrl: process.env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1'
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};
