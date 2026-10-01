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

  // 2. Lấy danh sách file và dữ liệu kho của một Shop (Đảm bảo cách ly đa shop 100%)
  async getFilesByShop(shop_id) {
    let files = [];
    const targetShopId = shop_id || 'default_shop';

    if (supabase) {
      try {
        let query = supabase.from('shop_knowledge_files').select('*');
        if (targetShopId !== 'all') {
          query = query.eq('shop_id', targetShopId);
        }
        const { data, error } = await query.order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          files = data;
        }
      } catch (err) {}
    }

    // Merge memory files for this shop
    const existingIds = new Set(files.map(f => f.id));
    for (const memFile of this.memoryFiles.values()) {
      if (targetShopId === 'all' || memFile.shop_id === targetShopId) {
        if (!existingIds.has(memFile.id)) {
          files.push(memFile);
          existingIds.add(memFile.id);
        } else {
          const idx = files.findIndex(f => f.id === memFile.id);
          if (idx !== -1) {
            files[idx] = memFile;
          }
        }
      }
    }

    return files;
  }

  // 2.1 Lấy toàn bộ file của tất cả các shop (Dành cho Admin Dashboard / File Manager / Bưu Cục)
  async getAllFiles() {
    let files = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('shop_knowledge_files')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          files = data;
        }
      } catch (err) {}
    }

    // Merge memory files
    const existingIds = new Set(files.map(f => f.id));
    for (const memFile of this.memoryFiles.values()) {
      if (!existingIds.has(memFile.id)) {
        files.push(memFile);
        existingIds.add(memFile.id);
      } else {
        // Overlay latest memory changes
        const idx = files.findIndex(f => f.id === memFile.id);
        if (idx !== -1) {
          files[idx] = memFile;
        }
      }
    }

    return files.length > 0 ? files : Array.from(this.memoryFiles.values());
  }

  // 2.2 Xóa file theo ID
  async deleteFile(file_id) {
    this.memoryFiles.delete(file_id);
    if (!supabase) {
      return { success: true, message: 'Đã xóa file khỏi bộ nhớ.' };
    }

    try {
      const { error } = await supabase
        .from('shop_knowledge_files')
        .delete()
        .eq('id', file_id);

      if (error) throw error;
      return { success: true, message: 'Đã xóa file thành công từ database.' };
    } catch (err) {
      return { success: true, message: `Đã xóa cục bộ (Lỗi Supabase: ${err.message})` };
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
        const itemName = (item.name || '').toLowerCase();
        const itemNameNoAccent = removeAccents(itemName);
        const itemCategory = (item.category || '').toLowerCase();
        const itemSku = (item.sku || '').toLowerCase();

        // Exact match
        if (cleanRaw && (itemName.includes(cleanRaw) || cleanRaw.includes(itemName))) {
          score += 60;
        }
        if (cleanNoAccent && itemNameNoAccent.includes(cleanNoAccent)) {
          score += 50;
        }
        if (itemSku && (cleanRaw.includes(itemSku) || itemSku.includes(cleanRaw))) {
          score += 70;
        }

        // Token matching
        let tokenMatches = 0;
        for (const token of tokens) {
          if (itemNameNoAccent.includes(token)) tokenMatches++;
          if (itemCategory.includes(token)) tokenMatches++;
        }
        score += tokenMatches * 15;

        // Semantic Vector Boost
        if (vectorScore > 0.4) {
          score += vectorScore * 30;
        }

        if (score >= 15 || !textKeyword || !textKeyword.trim()) {
          matchedItems.push({
            file_id: file.id,
            file_name: file.file_name,
            shop_id: file.shop_id,
            score,
            ...item,
            item
          });
        }
      }
    }

    matchedItems.sort((a, b) => b.score - a.score);
    return matchedItems;
  }

  // 4. Trừ số lượng tồn kho trong JSON và thêm Notification gửi Chủ Shop & Bưu Cục
  async deductStockAndNotify(shop_id, skuOrName, quantitySold = 1, reason = 'Khách đặt qua Chatbot', customerDetails = {}) {
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

        // Tạo thông báo mới cho Chủ Shop và Bưu Cục
        const unitPrice = Number(foundItem.price || 0);
        const totalPrice = unitPrice * Number(quantitySold);
        const todayStr = new Date().toISOString().split('T')[0];

        let alertLevel = 'INFO';
        let alertMsg = `📦 [Đã bán] ${quantitySold} ${foundItem.unit || 'cái'} "${foundItem.name}" (Doanh thu: ${totalPrice.toLocaleString('vi-VN')}đ). Tồn kho trước: ${currentQty} ➔ TỒN THỰC TẾ CÒN LẠI: ${newQty} ${foundItem.unit || 'cái'}.`;

        if (newQty <= 0) {
          alertLevel = 'CRITICAL';
          alertMsg = `🚨 [HẾT HÀNG] "${foundItem.name}" ĐÃ HẾT HÀNG TRONG KHO (0 ${foundItem.unit || 'cái'})! Tồn kho trước: ${currentQty} ➔ CÒN LẠI: 0. Chủ shop cần nhập thêm ngay.`;
        } else if (newQty <= minThreshold) {
          alertLevel = 'WARNING';
          alertMsg = `⚠️ [TỒN THẤP] "${foundItem.name}" chỉ còn ${newQty} ${foundItem.unit || 'cái'} (Tồn kho trước: ${currentQty} ➔ CÒN LẠI: ${newQty}). Vui lòng chuẩn bị nhập thêm.`;
        }

        const orderId = customerDetails.order_id || `DH_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`;
        const trackingNo = customerDetails.tracking_number || `VNPOST${Date.now().toString().slice(-8)}`;

        const newNotification = {
          id: `noti_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          order_id: orderId,
          tracking_number: trackingNo,
          shop_id: shop_id,
          created_at: new Date().toISOString(),
          sold_date: todayStr,
          level: alertLevel,
          message: alertMsg,
          item_sku: foundItem.sku,
          item_name: foundItem.name,
          unit: foundItem.unit || 'cái',
          unit_price: unitPrice,
          total_price: totalPrice,
          total_amount: Number(customerDetails.total_amount || totalPrice),
          quantity_sold: quantitySold,
          previous_quantity: currentQty,
          remaining_quantity: newQty,
          reason,
          customer_name: customerDetails.customer_name || 'Khách hàng',
          customer_phone: customerDetails.customer_phone || '090xxxxxxx',
          customer_address: customerDetails.customer_address || 'Địa chỉ giao hàng',
          order_status: customerDetails.order_status || 'PENDING'
        };

        const updatedNotifications = [newNotification, ...(targetFile.notifications || [])].slice(0, 100);

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

        // Tự động cập nhật file Excel của chính shop đó: thêm sheet đơn hàng đã bán & tổng hợp doanh thu ngày/tháng
        try {
          const shopReportService = require('../services/inventory/shopReport.service');
          shopReportService.syncAndSaveShopExcelFile(shop_id).catch(err => {
            console.warn(`[AutoExcelSync] Lỗi background sync file Excel shop "${shop_id}":`, err.message);
          });
        } catch (e) {}

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

  // 6. Lấy toàn bộ đơn hàng từ tất cả các Shop (Dành riêng cho Bưu Cục)
  async getAllOrders() {
    const allFiles = await this.getAllFiles();
    const orders = [];
    for (const f of allFiles) {
      if (Array.isArray(f.notifications)) {
        const validOrders = f.notifications.filter(n => Number(n.quantity_sold || 0) > 0);
        orders.push(...validOrders);
      }
    }
    // Sắp xếp đơn mới nhất lên đầu
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return orders;
  }

  // 7. Cập nhật trạng thái đơn hàng (Bưu cục đánh dấu Đã in / Đang giao / Hoàn thành)
  async updateOrderStatus(orderOrNotiId, newStatus = 'PRINTED') {
    const allFiles = await this.getAllFiles();
    let updated = false;

    for (const file of allFiles) {
      if (Array.isArray(file.notifications)) {
        const notiIndex = file.notifications.findIndex(n => n.id === orderOrNotiId || n.order_id === orderOrNotiId || n.tracking_number === orderOrNotiId);
        if (notiIndex !== -1) {
          file.notifications[notiIndex].order_status = newStatus;
          file.notifications[notiIndex].updated_at = new Date().toISOString();
          
          this.memoryFiles.set(file.id, { ...file, updated_at: new Date().toISOString() });

          if (supabase) {
            try {
              await supabase
                .from('shop_knowledge_files')
                .update({
                  notifications: file.notifications,
                  updated_at: new Date().toISOString()
                })
                .eq('id', file.id);
            } catch (e) {}
          }

          updated = true;
          return {
            success: true,
            order: file.notifications[notiIndex]
          };
        }
      }
    }

    if (!updated) {
      return { success: false, message: `Không tìm thấy đơn hàng "${orderOrNotiId}".` };
    }
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
