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

module.exports = router;
