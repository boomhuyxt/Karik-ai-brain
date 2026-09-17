const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// --- CÁC ROUTE KHO HÀNG TRUYỀN THỐNG ---
router.get('/items', (req, res) => inventoryController.getItems(req, res));
router.post('/items', (req, res) => inventoryController.saveItem(req, res));
router.post('/upload-excel', (req, res) => inventoryController.uploadExcel(req, res));
router.get('/query', (req, res) => inventoryController.queryStock(req, res));
router.post('/query', (req, res) => inventoryController.queryStock(req, res));
router.post('/sell', (req, res) => inventoryController.sellItem(req, res));
router.get('/alerts', (req, res) => inventoryController.getAlerts(req, res));
router.post('/sync-vectors', (req, res) => inventoryController.reSyncAllVectors(req, res));

// --- CÁC ROUTE 1 BẢNG DUY NHẤT (MULTI-SHOP CHATBOX WORKFLOW) ---
// 1. Chủ Shop gửi file vào Chatbox -> Lưu đường dẫn, parse JSON và train vector
router.post('/chat-upload', (req, res) => inventoryController.handleChatboxFileUpload(req, res));

// 2. Khách chat hỏi tồn kho sản phẩm của 1 Shop
router.post('/shop-query', (req, res) => inventoryController.handleShopCustomerChat(req, res));
router.get('/shop-query', (req, res) => inventoryController.handleShopCustomerChat(req, res));

// 3. Khách chốt đơn -> Tự động trừ kho và gửi thông báo cho Chủ Shop
router.post('/shop-order', (req, res) => inventoryController.handleShopOrderAndDeduct(req, res));

// 4. Chủ Shop xem thông báo biến động kho riêng của shop mình
router.get('/shop-alerts', (req, res) => inventoryController.getShopSpecificAlerts(req, res));

// 5. Chủ Shop xem Báo cáo doanh thu & sản phẩm bán trong ngày
router.get('/daily-report', (req, res) => inventoryController.getDailySalesReport(req, res));

// 6. Chủ Shop xuất file Excel tồn kho mới nhất đã trừ đơn hàng
router.get('/export-excel', (req, res) => inventoryController.exportInventoryExcel(req, res));

// 7. Quản lý File Upload (Admin Dashboard)
router.get('/files', (req, res) => inventoryController.getAllKnowledgeFiles(req, res));
router.delete('/files/:id', (req, res) => inventoryController.deleteKnowledgeFile(req, res));

// 8. Bưu Cục Đơn Hàng (Role Bưu Cục / Logistics)
router.get('/post-office-orders', (req, res) => inventoryController.getPostOfficeOrders(req, res));
router.post('/post-office-orders/:id/status', (req, res) => inventoryController.updatePostOfficeOrderStatus(req, res));
router.post('/post-office-orders/status', (req, res) => inventoryController.updatePostOfficeOrderStatus(req, res));

module.exports = router;
