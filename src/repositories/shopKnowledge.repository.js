const { supabase } = require('../config/supabase');

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

      if (error || !data) {
        return Array.from(this.memoryFiles.values()).filter(f => f.shop_id === shop_id);
      }
      return data;
    } catch (err) {
      return Array.from(this.memoryFiles.values()).filter(f => f.shop_id === shop_id);
    }
  }

  // 3. Tìm kiếm sản phẩm trong kho của Shop (Semantic Vector Search + JSON scan)
  async queryShopInventory(shop_id, queryVector, textKeyword) {
    const files = await this.getFilesByShop(shop_id);
    if (!files || files.length === 0) return [];

    const matchedItems = [];
    const rawKeyword = (textKeyword || '').toLowerCase().trim();
    // Tách các từ khóa có nghĩa (loại bỏ từ nối ngắn)
    const tokens = rawKeyword
      .replace(/[?!.,;:()]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2);

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
        const targetText = `${name} ${models} ${sku} ${desc}`;

        // Đếm số lượng từ khóa trùng khớp
        let matchedTokens = 0;
        for (const token of tokens) {
          if (targetText.includes(token)) {
            matchedTokens++;
          }
        }

        if (tokens.length > 0) {
          const tokenRatio = matchedTokens / tokens.length;
          score += tokenRatio * 0.7;
          if (matchedTokens > 0) {
            score += 0.3; // Base bonus khi có ít nhất 1 từ khớp
          }
        }

        if (vectorScore > 0) {
          score = Math.max(score, vectorScore);
        }

        if (score >= 0.25 || !rawKeyword) {
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

    for (const file of files) {
      const items = Array.isArray(file.inventory_data) ? [...file.inventory_data] : [];
      const itemIndex = items.findIndex(
        i => (i.sku && i.sku.toLowerCase() === skuOrName.toLowerCase()) ||
             (i.name && i.name.toLowerCase().includes(skuOrName.toLowerCase()))
      );

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
        let alertMsg = `📦 [Đã bán] ${quantitySold} x "${foundItem.name}". Tồn kho còn: ${newQty} ${foundItem.unit || 'cái'}.`;

        if (newQty <= 0) {
          alertLevel = 'CRITICAL';
          alertMsg = `🚨 [HẾT HÀNG] "${foundItem.name}" ĐÃ HẾT HÀNG TRONG KHO (0 ${foundItem.unit})! Cần nhập thêm ngay.`;
        } else if (newQty <= minThreshold) {
          alertLevel = 'WARNING';
          alertMsg = `⚠️ [TỒN THẤP] "${foundItem.name}" chỉ còn ${newQty} ${foundItem.unit}. Vui lòng chuẩn bị nhập thêm.`;
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

        // Lưu ngược lại vào Database (Cập nhật 1 dòng trong shop_knowledge_files)
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

    throw new Error(`Không tìm thấy sản phẩm "${skuOrName}" trong kho của Shop.`);
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
