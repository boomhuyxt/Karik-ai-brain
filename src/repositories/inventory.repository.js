const { supabase } = require('../config/supabase');

class InventoryRepository {
  constructor() {
    // In-memory fallback cache khi Supabase chưa cấu hình
    this.memoryItems = new Map();
    this.memoryEmbeddings = new Map();
    this.memoryAlerts = [];
    this._initMockData();
  }

  _initMockData() {
    const defaultItems = [
      {
        id: 'inv_castrol_01',
        sku: 'OIL-CASTROL-0.8L',
        name: 'Nhớt Castrol Power 1 4T 10W-40 0.8L',
        category: 'Dầu nhớt',
        compatible_models: 'Wave Alpha, Wave RSX, Blade, Future, Sirius, Jupiter (Xe số 4 thì)',
        quantity: 12,
        unit: 'chai',
        cost_price: 75000,
        price: 95000,
        location: 'Kệ A1 - Tủ Nhớt',
        min_threshold: 5,
        status: 'in_stock',
        description: 'Dầu nhớt bán tổng hợp cao cấp cho xe số 4 thì, tăng tốc êm ái, bốc máy, tiết kiệm nhiên liệu.',
        updated_at: new Date().toISOString()
      },
      {
        id: 'inv_motul_02',
        sku: 'OIL-MOTUL-SCOOTER-0.8L',
        name: 'Nhớt Motul Scooter Expert LE 10W-40 0.8L',
        category: 'Dầu nhớt',
        compatible_models: 'Air Blade, Vision, Lead, Vario, Click (Xe tay ga)',
        quantity: 2,
        unit: 'chai',
        cost_price: 90000,
        price: 115000,
        location: 'Kệ A2 - Tủ Nhớt',
        min_threshold: 4,
        status: 'low_stock',
        description: 'Dầu nhớt chuyên dụng cho xe tay ga 4 thì, giảm ma sát, tản nhiệt tốt.',
        updated_at: new Date().toISOString()
      },
      {
        id: 'inv_sparkplug_03',
        sku: 'PART-SPARK-NGK-CPR6EA',
        name: 'Bugi NGK CPR6EA-9 chân dài',
        category: 'Phụ tùng',
        compatible_models: 'Wave RSX Fi, Future 125, Blade Fi, Vision Fi',
        quantity: 0,
        unit: 'cái',
        cost_price: 35000,
        price: 55000,
        location: 'Khay B1 - Hộp Bugi',
        min_threshold: 3,
        status: 'out_of_stock',
        description: 'Bugi đánh lửa chính hãng NGK tiêu chuẩn cho các dòng xe máy phun xăng điện tử.',
        updated_at: new Date().toISOString()
      }
    ];

    for (const item of defaultItems) {
      this.memoryItems.set(item.id, item);
    }
  }

  // Lấy toàn bộ danh sách sản phẩm
  async findAll({ search, category, status, limit = 100, offset = 0 } = {}) {
    if (!supabase) {
      let items = Array.from(this.memoryItems.values());
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(i => 
          i.name?.toLowerCase().includes(s) || 
          i.sku?.toLowerCase().includes(s) ||
          i.compatible_models?.toLowerCase().includes(s) ||
          i.category?.toLowerCase().includes(s)
        );
      }
      if (category) items = items.filter(i => i.category === category);
      if (status) items = items.filter(i => i.status === status);

      const total = items.length;
      const data = items.slice(offset, offset + limit);
      return { data, total };
    }

    try {
      let query = supabase.from('inventory_items').select('*', { count: 'exact' });
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,compatible_models.ilike.%${search}%`);
      }
      if (category) query = query.eq('category', category);
      if (status) query = query.eq('status', status);

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return this._findAllMemoryFallback({ search, category, status, limit, offset });
      }
      return { data: data || [], total: count || 0 };
    } catch (err) {
      return this._findAllMemoryFallback({ search, category, status, limit, offset });
    }
  }

  _findAllMemoryFallback({ search, category, status, limit, offset }) {
    let items = Array.from(this.memoryItems.values());
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i => 
        i.name?.toLowerCase().includes(s) || 
        i.sku?.toLowerCase().includes(s) ||
        i.compatible_models?.toLowerCase().includes(s)
      );
    }
    return { data: items.slice(offset, offset + limit), total: items.length };
  }

  // Tìm theo ID hoặc SKU
  async findByIdOrSku(idOrSku) {
    if (!idOrSku) return null;
    if (!supabase) {
      return Array.from(this.memoryItems.values()).find(
        i => i.id === idOrSku || i.sku === idOrSku
      ) || null;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .or(`id.eq.${idOrSku},sku.eq.${idOrSku}`)
        .maybeSingle();

      if (error || !data) {
        return Array.from(this.memoryItems.values()).find(
          i => i.id === idOrSku || i.sku === idOrSku
        ) || null;
      }
      return data;
    } catch (err) {
      return Array.from(this.memoryItems.values()).find(
        i => i.id === idOrSku || i.sku === idOrSku
      ) || null;
    }
  }

  // Upsert 1 mặt hàng
  async upsert(item) {
    const itemData = {
      ...item,
      updated_at: new Date().toISOString()
    };
    if (!itemData.id) {
      itemData.id = `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    this.memoryItems.set(itemData.id, itemData);

    if (!supabase) return itemData;

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(itemData, { onConflict: 'sku' })
        .select()
        .single();

      if (error) return itemData;
      return data || itemData;
    } catch (err) {
      return itemData;
    }
  }

  // Bulk Upsert danh sách từ Excel
  async bulkUpsert(items) {
    const saved = [];
    for (const item of items) {
      const res = await this.upsert(item);
      saved.push(res);
    }
    return saved;
  }

  // Lưu Vector Embedding của sản phẩm
  async saveEmbedding(itemId, chunkText, embedding) {
    const vecRecord = {
      id: `vec_inv_${itemId}`,
      item_id: itemId,
      chunk_text: chunkText,
      embedding: embedding,
      updated_at: new Date().toISOString()
    };

    this.memoryEmbeddings.set(itemId, vecRecord);

    if (!supabase) return vecRecord;

    try {
      const { data, error } = await supabase
        .from('inventory_embeddings')
        .upsert(vecRecord, { onConflict: 'item_id' })
        .select()
        .single();

      if (error) return vecRecord;
      return data || vecRecord;
    } catch (err) {
      return vecRecord;
    }
  }

  // Tìm kiếm Vector tương đồng (Vector Semantic Search)
  async searchSimilarVectors(queryVector, limit = 5) {
    // 1. Thử gọi RPC Supabase nếu có pgvector
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('match_inventory', {
          query_embedding: queryVector,
          match_threshold: 0.5,
          match_count: limit
        });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        // Fallback local cosine similarity
      }
    }

    // 2. Fallback: Tính Cosine Similarity trực tiếp trên Memory Embeddings
    const results = [];
    for (const [itemId, record] of this.memoryEmbeddings.entries()) {
      if (!record.embedding || record.embedding.length === 0) continue;
      const sim = this._cosineSimilarity(queryVector, record.embedding);
      const item = this.memoryItems.get(itemId);
      if (item) {
        results.push({
          item_id: itemId,
          item: item,
          chunk_text: record.chunk_text,
          similarity: sim
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  // Tính cosine similarity giữa 2 vectors
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Lưu lịch sử cảnh báo / biến động kho
  async saveAlert(alert) {
    const alertData = {
      id: `alert_${Date.now()}`,
      ...alert,
      created_at: new Date().toISOString()
    };
    this.memoryAlerts.unshift(alertData);
    if (this.memoryAlerts.length > 100) this.memoryAlerts.pop();

    if (supabase) {
      try {
        await supabase.from('inventory_alerts').insert(alertData);
      } catch (e) {}
    }
    return alertData;
  }

  async getAlerts(limit = 20) {
    if (!supabase) {
      return this.memoryAlerts.slice(0, limit);
    }
    try {
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error || !data) return this.memoryAlerts.slice(0, limit);
      return data;
    } catch (e) {
      return this.memoryAlerts.slice(0, limit);
    }
  }
}

module.exports = new InventoryRepository();
