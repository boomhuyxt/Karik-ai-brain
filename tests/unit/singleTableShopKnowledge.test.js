const { describe, it } = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');

const chatFileHandlerService = require('../../src/services/ai/chatFileHandler.service');
const shopChatbotService = require('../../src/services/ai/shopChatbot.service');
const shopKnowledgeRepo = require('../../src/repositories/shopKnowledge.repository');

describe('--- Single-Table Multi-Shop AI Knowledge & Chatbox Test Suite ---', () => {

  const sampleShopId = 'shop_xe_may_01';

  it('1. Should handle file uploaded via Chatbox, parse Excel, create vector and save to single table', async () => {
    // Tạo file Excel giả lập
    const sampleItems = [
      {
        'Tên sản phẩm': 'Nhớt Castrol Power 1 0.8L',
        'Mã SKU': 'CASTROL-WAVE-08',
        'Dòng xe tương thích': 'Honda Wave, Future, Blade, Sirius',
        'Số lượng tồn': 10,
        'Đơn vị': 'chai',
        'Giá bán': 95000,
        'Vị trí': 'Kệ A1',
        'Cảnh báo tồn': 3
      },
      {
        'Tên sản phẩm': 'Bugi Denso U22EPR9',
        'Mã SKU': 'BUGI-DENSO-01',
        'Dòng xe tương thích': 'Wave RSX, Blade 110',
        'Số lượng tồn': 5,
        'Đơn vị': 'cái',
        'Giá bán': 45000,
        'Vị trí': 'Khay B2',
        'Cảnh báo tồn': 2
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleItems);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = buffer.toString('base64');

    const result = await chatFileHandlerService.handleChatFileUpload({
      shop_id: sampleShopId,
      fileName: 'kho_nhot_wave_thang9.xlsx',
      base64Data: base64Data
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.total_items, 2);
    assert.ok(result.message.includes('Đã nạp thành công'));

    // Kiểm tra trong repository
    const shopFiles = await shopKnowledgeRepo.getFilesByShop(sampleShopId);
    assert.strictEqual(shopFiles.length >= 1, true);
    assert.strictEqual(shopFiles[0].shop_id, sampleShopId);
  });

  it('2. Should answer customer question about Wave lubricant with correct real-time stock', async () => {
    const response = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      question: 'Shop ơi có chai nhớt nào dùng cho xe Wave không, còn hàng không?'
    });

    assert.strictEqual(response.found, true);
    assert.ok(response.reply.includes('CÒN HÀNG'));
    assert.ok(response.reply.includes('Castrol Power 1'));
    assert.ok(response.reply.includes('10 chai'));
  });

  it('3. Should process order, deduct stock in JSON and notify shop owner', async () => {
    const orderResult = await shopChatbotService.processOrderAndDeduct({
      shop_id: sampleShopId,
      item_identifier: 'CASTROL-WAVE-08',
      quantity: 2,
      customer_name: 'Anh Nam',
      customer_phone: '0901234567'
    });

    assert.strictEqual(orderResult.success, true);
    assert.strictEqual(orderResult.updated_item.quantity, 8); // 10 - 2 = 8
    assert.ok(orderResult.owner_alert.message.includes('Đã bán'));

    // Kiểm tra danh sách thông báo của Chủ Shop
    const alerts = await shopChatbotService.getShopAlerts(sampleShopId);
    assert.strictEqual(alerts.length >= 1, true);
    assert.strictEqual(alerts[0].quantity_sold, 2);
  });

  it('4. Should isolate data between different shops without conflict', async () => {
    const otherShopId = 'shop_khac_99';
    const responseOther = await shopChatbotService.answerCustomerQuestion({
      shop_id: otherShopId,
      question: 'Có nhớt Wave không?'
    });

    // Shop khác chưa upload file thì không có dữ liệu, không bị lẫn với shop_xe_may_01
    assert.strictEqual(responseOther.found, false);
  });

});
