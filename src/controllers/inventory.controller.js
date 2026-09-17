const inventoryRepo = require('../repositories/inventory.repository');
const excelParserService = require('../services/inventory/excelParser.service');
const vectorSyncService = require('../services/inventory/vectorSync.service');
const inventoryQueryService = require('../services/inventory/inventoryQuery.service');
const stockAlertService = require('../services/inventory/stockAlert.service');
const chatFileHandlerService = require('../services/ai/chatFileHandler.service');
const shopChatbotService = require('../services/ai/shopChatbot.service');
const shopReportService = require('../services/inventory/shopReport.service');

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
      const shop_id = (req.body && req.body.shop_id) || req.query.shop_id || 'default_shop';
      const question = (req.body && req.body.question) || req.query.q || req.query.question || '';
      const session_id = (req.body && req.body.session_id) || req.query.session_id || shop_id;
      const result = await shopChatbotService.answerCustomerQuestion({
        shop_id,
        question,
        session_id
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

  // 12. Báo cáo doanh thu & sản phẩm bán trong ngày
  async getDailySalesReport(req, res) {
    try {
      const shop_id = req.query.shop_id || 'default_shop';
      const date = req.query.date || null;
      const report = await shopReportService.generateDailySalesReport(shop_id, date);
      return res.json({ success: true, ...report });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 13. Xuất file Excel tồn kho mới nhất đã trừ đơn hàng
  async exportInventoryExcel(req, res) {
    try {
      const shop_id = req.query.shop_id || 'default_shop';
      const result = await shopReportService.exportUpdatedInventoryExcel(shop_id);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 14. Lấy danh sách toàn bộ các file Excel/CSV đã upload (Dành cho Quản Lý Upload File)
  async getAllKnowledgeFiles(req, res) {
    try {
      const shopKnowledgeRepo = require('../repositories/shopKnowledge.repository');
      const shop_id = req.query.shop_id || null;
      let files = [];
      if (shop_id) {
        files = await shopKnowledgeRepo.getFilesByShop(shop_id);
      } else {
        files = await shopKnowledgeRepo.getAllFiles();
      }

      // Thống kê metadata cho từng file
      const formattedFiles = files.map(f => {
        const items = Array.isArray(f.inventory_data) ? f.inventory_data : [];
        return {
          id: f.id,
          shop_id: f.shop_id,
          file_name: f.file_name,
          file_path: f.file_path,
          total_items: items.length,
          in_stock_count: items.filter(i => Number(i.quantity || 0) > 0).length,
          out_of_stock_count: items.filter(i => Number(i.quantity || 0) <= 0).length,
          created_at: f.created_at,
          updated_at: f.updated_at,
          items_preview: items.slice(0, 10),
          all_items: items
        };
      });

      return res.json({
        success: true,
        total_files: formattedFiles.length,
        data: formattedFiles
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 15. Xóa file upload theo ID
  async deleteKnowledgeFile(req, res) {
    try {
      const shopKnowledgeRepo = require('../repositories/shopKnowledge.repository');
      const file_id = req.params.id || req.body.file_id;
      if (!file_id) {
        return res.status(400).json({ success: false, error: 'Thiếu file_id cần xóa.' });
      }
      const result = await shopKnowledgeRepo.deleteFile(file_id);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
  // 16. Lấy toàn bộ đơn hàng chuyển tiếp về Bưu Cục
  async getPostOfficeOrders(req, res) {
    try {
      const shopKnowledgeRepo = require('../repositories/shopKnowledge.repository');
      const orders = await shopKnowledgeRepo.getAllOrders();
      return res.json({
        success: true,
        total_orders: orders.length,
        data: orders
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 17. Cập nhật trạng thái đơn hàng (Đã in vận đơn / Đang vận chuyển / Giao thành công)
  async updatePostOfficeOrderStatus(req, res) {
    try {
      const shopKnowledgeRepo = require('../repositories/shopKnowledge.repository');
      const orderId = req.params.id || req.body.order_id;
      const { status } = req.body;
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng (order_id).' });
      }
      const result = await shopKnowledgeRepo.updateOrderStatus(orderId, status || 'PRINTED');
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new InventoryController();

