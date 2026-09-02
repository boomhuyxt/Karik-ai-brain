require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  github: {
    get token() {
      return process.env.GITHUB_PAT || '';
    },
    get owner() {
      return process.env.GITHUB_OWNER || 'boomhuyxt';
    },
    get repo() {
      return process.env.GITHUB_REPO || 'Obsidian-Karik-Ai';
    }
  },
  obsidianVaultPath: process.env.OBSIDIAN_VAULT_PATH || '',
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
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '432a5a828609d79411ce6dda0f3bbfec',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    imageModel: process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-9b',
    turnstileSiteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    turnstileSecretKey: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA',
    turnstileEnabled: process.env.CLOUDFLARE_TURNSTILE_ENABLED === 'true'
  },
  stableDiffusion: {
    apiUrl: process.env.SD_API_URL || 'http://127.0.0.1:7860/sdapi/v1/txt2img',
    baseUrl: process.env.SD_BASE_URL || 'http://127.0.0.1:7860',
    steps: parseInt(process.env.SD_STEPS || '20', 10),
    cfgScale: parseFloat(process.env.SD_CFG_SCALE || '7'),
    samplerName: process.env.SD_SAMPLER || 'Euler a',
    negativePrompt: process.env.SD_NEGATIVE_PROMPT || 'ugly, deformed, disfigured, low quality, blurry, watermark, bad anatomy, bad hands, extra limbs'
  },
  pollinations: {
    baseUrl: process.env.POLLINATIONS_BASE_URL || 'https://image.pollinations.ai/prompt',
    defaultModel: process.env.POLLINATIONS_MODEL || 'flux',
    nologo: true
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};
