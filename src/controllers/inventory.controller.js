const inventoryRepo = require('../repositories/inventory.repository');
const excelParserService = require('../services/inventory/excelParser.service');
const vectorSyncService = require('../services/inventory/vectorSync.service');
const inventoryQueryService = require('../services/inventory/inventoryQuery.service');
const stockAlertService = require('../services/inventory/stockAlert.service');
const chatFileHandlerService = require('../services/ai/chatFileHandler.service');
const shopChatbotService = require('../services/ai/shopChatbot.service');

class InventoryController {
  // 1. Lấy danh sách hàng hóa trong kho
  async getItems(req, res) {
    try {
      const { search, category, status, limit, offset } = req.query;
      const result = await inventoryRepo.findAll({
        search,
        category,
        status,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. Thêm hoặc Cập nhật 1 mặt hàng
  async saveItem(req, res) {
    try {
      const itemData = req.body;
      if (!itemData.name) {
        return res.status(400).json({ success: false, error: 'Tên sản phẩm không được để trống.' });
      }

      const savedItem = await inventoryRepo.upsert(itemData);
      await vectorSyncService.syncItemVector(savedItem);

      return res.json({
        success: true,
        message: 'Lưu sản phẩm và cập nhật Vector thành công.',
        data: savedItem
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 3. Upload File Excel / CSV kho hàng -> Parse -> Lưu DB -> Train Vector
  async uploadExcel(req, res) {
    try {
      const { base64Data, fileName } = req.body;
      if (!base64Data) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp chuỗi Base64 dữ liệu file Excel.'
        });
      }

      const normalizedItems = excelParserService.parseExcel(base64Data);
      const savedItems = await inventoryRepo.bulkUpsert(normalizedItems);
      const vectorResults = await vectorSyncService.batchSyncVectors(savedItems);

      return res.json({
        success: true,
        message: `Đã nhập thành công ${savedItems.length} sản phẩm từ file "${fileName || 'excel'}" và hoàn tất đồng bộ Vector cho AI.`,
        total_items: savedItems.length,
        items: savedItems,
        vector_sync: vectorResults
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 4. Tra cứu tồn kho bằng câu hỏi tự nhiên của khách (AI Hybrid Search)
  async queryStock(req, res) {
    try {
      const query = req.query.q || req.body.query || req.body.text;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập câu hỏi cần tra cứu.' });
      }

      const result = await inventoryQueryService.queryStock(query);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 5. Bán hàng / Trừ kho / Phát cảnh báo cho chủ shop
  async sellItem(req, res) {
    try {
      const { idOrSku, quantity, reason } = req.body;
      if (!idOrSku || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp mã sản phẩm (idOrSku) và số lượng bán (quantity).'
        });
      }

      const result = await stockAlertService.updateStock(idOrSku, Number(quantity), reason);
      return res.json({
        success: true,
        message: 'Cập nhật số lượng kho và tạo thông báo thành công.',
        data: result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 6. Lấy danh sách thông báo biến động kho dành cho Chủ Shop
  async getAlerts(req, res) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const alerts = await stockAlertService.getRecentAlerts(limit);
      return res.json({ success: true, data: alerts });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 7. Đồng bộ lại toàn bộ Vector của kho
  async reSyncAllVectors(req, res) {
    try {
      const { data: items } = await inventoryRepo.findAll({ limit: 1000 });
      const results = await vectorSyncService.batchSyncVectors(items);
      return res.json({
        success: true,
        message: `Đã re-sync vector cho ${items.length} mặt hàng.`,
        results
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // --- MULTI-SHOP SINGLE TABLE ENDPOINTS (Chatbox Integration) ---

  // 8. Chủ Shop gửi File (Excel/CSV/Doc) trực tiếp qua Chatbox
  async handleChatboxFileUpload(req, res) {
    try {
      const { shop_id, fileName, base64Data } = req.body;
      const result = await chatFileHandlerService.handleChatFileUpload({
        shop_id: shop_id || 'default_shop',
        fileName: fileName || `file_${Date.now()}.xlsx`,
        base64Data
      });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 9. Khách hàng chat hỏi sản phẩm và tồn kho của 1 Shop
  async handleShopCustomerChat(req, res) {
    try {
      const { shop_id, question } = req.body;
      const result = await shopChatbotService.answerCustomerQuestion({
        shop_id: shop_id || 'default_shop',
        question: question || req.query.q
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 10. Khách chốt mua -> Trừ kho và gửi cảnh báo đến Chủ Shop
  async handleShopOrderAndDeduct(req, res) {
    try {
      const { shop_id, item_identifier, quantity, customer_name, customer_phone } = req.body;
      const result = await shopChatbotService.processOrderAndDeduct({
        shop_id: shop_id || 'default_shop',
        item_identifier,
        quantity: quantity ? Number(quantity) : 1,
        customer_name,
        customer_phone
      });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 11. Chủ Shop xem các thông báo biến động kho của Shop mình
  async getShopSpecificAlerts(req, res) {
    try {
      const shop_id = req.query.shop_id || req.params.shop_id || 'default_shop';
      const alerts = await shopChatbotService.getShopAlerts(shop_id);
      return res.json({ success: true, shop_id, data: alerts });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new InventoryController();
