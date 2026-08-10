const env = require('./env');

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  createClient = null;
}

let supabase = null;

if (createClient && env.supabase.url && env.supabase.key) {
  try {
    supabase = createClient(env.supabase.url, env.supabase.key);
  } catch (err) {
    console.warn('[Supabase Config] Failed to initialize Supabase client:', err.message);
  }
}

module.exports = {
  supabase,
  url: env.supabase.url,
  key: env.supabase.key,
  publishableKey: env.supabase.publishableKey,
  secretKey: env.supabase.secretKey,
  jwksUrl: env.supabase.jwksUrl
};
