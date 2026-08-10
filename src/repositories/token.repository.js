const { supabase } = require('../config/supabase');

class TokenRepository {
  constructor() {
    this.memoryUsage = {
      gemini: 0,
      openai: 0,
      claude: 0,
      groq: 0,
      openrouter: 0
    };

    this.providerMeta = {
      gemini: { name: 'Gemini 3.5 Flash', max: 250000, color: '#fbbf24', envKey: 'GEMINI_API_KEY' },
      openai: { name: 'GPT-4o', max: 100000, color: '#d3bbff', envKey: 'OPENAI_API_KEY' },
      claude: { name: 'Claude 3.5', max: 100000, color: '#5de6ff', envKey: 'CLAUDE_API_KEY' },
      groq: { name: 'Groq Llama 3', max: 100000, color: '#34d399', envKey: 'GROQ_API_KEY' },
      openrouter: { name: 'OpenRouter', max: 100000, color: '#a78bfa', envKey: 'OPENROUTER_API_KEY' }
    };
  }

  checkKeyLinked(envKey) {
    const key = process.env[envKey];
    return Boolean(key && key.trim() !== '' && !key.includes('your_'));
  }

  async recordUsage(record) {
    const providerKey = (record.provider || 'gemini').toLowerCase();
    const addedTokens = record.total_tokens || 0;

    if (this.memoryUsage[providerKey] !== undefined) {
      this.memoryUsage[providerKey] += addedTokens;
    } else {
      this.memoryUsage[providerKey] = addedTokens;
    }

    if (supabase) {
      try {
        await supabase.from('token_usage').insert(record);
      } catch (err) {
        console.warn('Supabase recordUsage error:', err.message);
      }
    }
    return record;
  }

  async getSummary() {
    let totals = { ...this.memoryUsage };

    if (supabase) {
      try {
        const { data } = await supabase.from('token_usage').select('provider, total_tokens');
        if (data && data.length > 0) {
          // Reset totals to 0 from memory if database contains valid history
          const dbTotals = { gemini: 0, openai: 0, claude: 0, groq: 0, openrouter: 0 };
          data.forEach(item => {
            const p = (item.provider || 'gemini').toLowerCase();
            dbTotals[p] = (dbTotals[p] || 0) + (item.total_tokens || 0);
          });
          // Merge with memory usage
          Object.keys(totals).forEach(p => {
            totals[p] = (dbTotals[p] || 0) + (this.memoryUsage[p] || 0);
          });
        }
      } catch (err) {
        console.warn('Supabase getSummary error:', err.message);
      }
    }

    let grandTotal = 0;
    const providersList = Object.keys(this.providerMeta).map(key => {
      const used = totals[key] || 0;
      grandTotal += used;
      const meta = this.providerMeta[key];
      const pct = Math.min(100, Math.round((used / meta.max) * 100));
      const isLinked = this.checkKeyLinked(meta.envKey);

      return {
        key,
        name: meta.name,
        used,
        max: meta.max,
        percentage: pct,
        color: meta.color,
        isLinked
      };
    });

    const formattedTotal = grandTotal >= 1000 ? `${(grandTotal / 1000).toFixed(1)}k` : `${grandTotal}`;

    return {
      total: formattedTotal,
      rawTotal: grandTotal,
      providers: providersList
    };
  }
}

module.exports = new TokenRepository();

