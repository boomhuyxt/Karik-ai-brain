const { supabase } = require('../config/supabase');

// Hàm loại bỏ dấu tiếng Việt để tìm kiếm siêu nhạy
function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Từ điển đồng nghĩa / từ viết tắt thông dụng ngành xe máy
const SYNONYMS = {
  'cuaroa': 'curoa',
  'cua-roa': 'curoa',
  'day-curoa': 'curoa',
  'day-cuaroa': 'curoa',
  'day-dai': 'curoa',
  'chan-chong-giua': 'chan chong dung',
  'chong-giua': 'chong dung',
  'chong-nghieng': 'chan chong',
  'nhot': 'dau nhot',
  'dau-may': 'dau nhot',
  'bo-thang': 'ma phanh',
  'bo-dia': 'ma phanh',
  'dia-thang': 'dia phanh',
  'loc-gio': 'tam loc gio'
};

// Các từ dừng (Stop words) trong câu hỏi giao tiếp tiếng Việt cần loại bỏ khi tính điểm từ khóa
const STOP_WORDS = new Set([
  'shop', 'cho', 'em', 'anh', 'chi', 'toi', 'minh', 'hoi', 'con', 'khong', 'a', 'oi',
  'co', 'nao', 'dung', 'duoc', 'nhieu', 'bao', 'tien', 'o', 'dau', 'voi', 'cai', 'chai',
  'bo', 'nhe', 'da', 'giup', 'xem', 'ben', 'cac', 'loai', 'mot', 'hai', 'chiec'
]);

class ShopKnowledgeRepository {
  constructor() {
    this.memoryFiles = new Map();
  }

  // 1. Lưu bản ghi File mới hoặc cập nhật file của Shop
  async saveFileRecord({ id, shop_id, file_name, file_path, file_type = 'excel', inventory_data = [], semantic_chunks = '', embedding = null }) {
    const fileId = id || `file_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const record = {
      id: fileId,
      shop_id: shop_id || 'default_shop',
      file_name,
      file_path,
      file_type,
      inventory_data,
      semantic_chunks,
      embedding,
      notifications: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.memoryFiles.set(fileId, record);

    if (!supabase) return record;

    try {
      const { data, error } = await supabase
        .from('shop_knowledge_files')
        .upsert(record)
        .select()
        .single();

      if (error) return record;
      return data || record;
    } catch (err) {
      return record;
    }
  }

  // 2. Lấy danh sách file và dữ liệu kho của một Shop
  async getFilesByShop(shop_id) {
    if (!supabase) {
      return Array.from(this.memoryFiles.values()).filter(f => f.shop_id === shop_id);
    }

    try {
      const { data, error } = await supabase
        .from('shop_knowledge_files')
        .select('*')
        .eq('shop_id', shop_id)
        .order('updated_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return Array.from(this.memoryFiles.values()).filter(f => f.shop_id === shop_id);
      }
      return data;
    } catch (err) {
      return Array.from(this.memoryFiles.values()).filter(f => f.shop_id === shop_id);
    }
  }

  // 3. Tìm kiếm sản phẩm trong kho của Shop (Semantic Vector Search + Fuzzy Vietnamese Matching)
  async queryShopInventory(shop_id, queryVector, textKeyword) {
    const files = await this.getFilesByShop(shop_id);
    if (!files || files.length === 0) return [];

    const matchedItems = [];
    const cleanRaw = (textKeyword || '').toLowerCase().trim();
    const cleanNoAccent = removeAccents(cleanRaw);

    // Chuẩn hóa từ đồng nghĩa
    let expandedText = cleanNoAccent;
    for (const [key, syn] of Object.entries(SYNONYMS)) {
      if (expandedText.includes(key.replace(/-/g, ' '))) {
        expandedText += ' ' + syn;
      }
    }

    // Tách từ khóa quan trọng (loại bỏ stop words)
    const tokens = expandedText
      .replace(/[?!.,;:()]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2 && !STOP_WORDS.has(t));

    for (const file of files) {
      const items = Array.isArray(file.inventory_data) ? file.inventory_data : [];
      let vectorScore = 0;
      if (queryVector && file.embedding) {
        vectorScore = this._cosineSimilarity(queryVector, file.embedding);
      }

      for (const item of items) {
        let score = 0;
        const name = (item.name || '').toLowerCase();
        const models = (item.compatible_models || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        const rawTarget = `${name} ${models} ${sku} ${desc}`;
        const noAccentTarget = removeAccents(rawTarget);

        // 1. Khớp chính xác cả cụm
        if (tokens.length > 0 && noAccentTarget.includes(tokens.join(' '))) {
          score += 0.9;
        }

        // 2. Khớp từng từ khóa chính (Keywords Overlap)
        let matchedTokens = 0;
        for (const token of tokens) {
          if (noAccentTarget.includes(token)) {
            matchedTokens++;
          }
        }

        if (tokens.length > 0) {
          const ratio = matchedTokens / tokens.length;
          score += ratio * 0.7;
          if (matchedTokens > 0) score += 0.25;
        }

        // 3. Kết hợp điểm Vector
        if (vectorScore > 0) {
          score = Math.max(score, vectorScore);
        }

        // Nếu không truyền keyword (lấy toàn bộ danh sách) hoặc điểm số đủ cao
        if (score >= 0.2 || !textKeyword || !textKeyword.trim()) {
          matchedItems.push({
            file_id: file.id,
            file_name: file.file_name,
            shop_id: file.shop_id,
            score: score,
            ...item
          });
        }
      }
    }

    matchedItems.sort((a, b) => b.score - a.score);
    return matchedItems;
  }

  // 4. Trừ số lượng tồn kho trong JSON và thêm Notification gửi Chủ Shop
  async deductStockAndNotify(shop_id, skuOrName, quantitySold = 1, reason = 'Khách đặt qua Chatbot') {
    const files = await this.getFilesByShop(shop_id);
    if (!files || files.length === 0) {
      throw new Error(`Shop "${shop_id}" chưa có dữ liệu kho nào.`);
    }

    let foundItem = null;
    let targetFile = null;
    const targetSearch = removeAccents(skuOrName || '');

    for (const file of files) {
      const items = Array.isArray(file.inventory_data) ? [...file.inventory_data] : [];
      const itemIndex = items.findIndex(i => {
        const iSku = removeAccents(i.sku || '');
        const iName = removeAccents(i.name || '');
        return (iSku && iSku === targetSearch) ||
               (iName && (iName.includes(targetSearch) || targetSearch.includes(iName)));
      });

      if (itemIndex !== -1) {
        targetFile = file;
        const currentQty = Number(items[itemIndex].quantity || 0);
        const newQty = Math.max(0, currentQty - Number(quantitySold));
        const minThreshold = Number(items[itemIndex].min_threshold || 3);

        items[itemIndex].quantity = newQty;
        items[itemIndex].status = newQty <= 0 ? 'out_of_stock' : (newQty <= minThreshold ? 'low_stock' : 'in_stock');
        foundItem = { ...items[itemIndex], previous_quantity: currentQty };

        // Tạo thông báo mới cho Chủ Shop
        let alertLevel = 'INFO';
        let alertMsg = `📦 [Đã bán] ${quantitySold} ${foundItem.unit || 'cái'} "${foundItem.name}". Tồn kho còn: ${newQty} ${foundItem.unit || 'cái'}.`;

        if (newQty <= 0) {
          alertLevel = 'CRITICAL';
          alertMsg = `🚨 [HẾT HÀNG] "${foundItem.name}" ĐÃ HẾT HÀNG TRONG KHO (0 ${foundItem.unit || 'cái'})! Chủ shop cần nhập thêm ngay.`;
        } else if (newQty <= minThreshold) {
          alertLevel = 'WARNING';
          alertMsg = `⚠️ [TỒN THẤP] "${foundItem.name}" chỉ còn ${newQty} ${foundItem.unit || 'cái'}. Vui lòng chuẩn bị nhập thêm.`;
        }

        const newNotification = {
          id: `noti_${Date.now()}`,
          created_at: new Date().toISOString(),
          level: alertLevel,
          message: alertMsg,
          item_sku: foundItem.sku,
          item_name: foundItem.name,
          quantity_sold: quantitySold,
          remaining_quantity: newQty,
          reason
        };

        const updatedNotifications = [newNotification, ...(targetFile.notifications || [])].slice(0, 50);

        const updatedRecord = {
          ...targetFile,
          inventory_data: items,
          notifications: updatedNotifications,
          updated_at: new Date().toISOString()
        };

        this.memoryFiles.set(targetFile.id, updatedRecord);

        if (supabase) {
          try {
            await supabase
              .from('shop_knowledge_files')
              .update({
                inventory_data: items,
                notifications: updatedNotifications,
                updated_at: new Date().toISOString()
              })
              .eq('id', targetFile.id);
          } catch (e) {}
        }

        return {
          success: true,
          item: foundItem,
          notification: newNotification
        };
      }
    }

    throw new Error(`Không tìm thấy sản phẩm phù hợp với "${skuOrName}" trong kho của Shop.`);
  }

  // 5. Lấy danh sách thông báo của Shop
  async getNotifications(shop_id) {
    const files = await this.getFilesByShop(shop_id);
    const allNotis = [];
    for (const f of files) {
      if (Array.isArray(f.notifications)) {
        allNotis.push(...f.notifications);
      }
    }
    allNotis.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return allNotis;
  }

  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

module.exports = new ShopKnowledgeRepository();
