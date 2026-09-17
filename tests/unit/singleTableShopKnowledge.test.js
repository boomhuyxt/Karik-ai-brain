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
    assert.ok(result.message.includes('thành công'));

    // Kiểm tra trong repository
    const shopFiles = await shopKnowledgeRepo.getFilesByShop(sampleShopId);
    assert.strictEqual(shopFiles.length >= 1, true);
    assert.strictEqual(shopFiles[0].shop_id, sampleShopId);
  });

  it('2. Should answer customer question about Wave lubricant and hide internal stock & warehouse location', async () => {
    const response = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      question: 'Shop ơi có chai nhớt nào dùng cho xe Wave không, còn hàng không?'
    });

    assert.strictEqual(response.found, true);
    assert.ok(response.reply.includes('CÒN HÀNG'));
    assert.ok(response.reply.includes('Castrol Power 1'));
    assert.strictEqual(response.reply.includes('Vị trí kho'), false);
    assert.strictEqual(response.reply.includes('Tồn kho hiện tại:'), false);
  });

  it('2.1 Should properly advise customer when requested buy quantity exceeds current stock', async () => {
    // 1. Khách hỏi xem sản phẩm trước
    await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id: 'test_exceed_qty_session',
      question: 'Shop có nhớt Castrol cho Wave không?'
    });

    // 2. Khách yêu cầu mua 50 chai (trong khi kho chỉ còn 10 chai)
    const exceedResponse = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id: 'test_exceed_qty_session',
      question: 'Tôi muốn mua 50 chai'
    });

    assert.strictEqual(exceedResponse.found, true);
    assert.ok(exceedResponse.reply.includes('hiện chỉ còn 10 chai trong kho thôi ạ'));
    assert.ok(exceedResponse.reply.includes('đợi thêm vài ngày để shop nhập kho'));
    assert.ok(exceedResponse.reply.includes('mua sản phẩm này với số lượng tồn kho'));
    assert.strictEqual(exceedResponse.reply.includes('Ghi chú: Ô Tồn kho'), false);
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

  it('5. Should handle realistic 4-step conversational sales & checkout flow', async () => {
    const session_id = 'test_session_user_01';

    // Bước 1: Hỏi tồn kho
    const step1 = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id,
      question: 'Nhớt Castrol xe Wave còn hàng không shop?'
    });
    assert.strictEqual(step1.found, true);
    assert.ok(step1.reply.includes('CÒN HÀNG'));
    assert.ok(step1.reply.includes('Castrol Power 1'));

    // Bước 2: Khách bảo muốn mua 2 chai
    const step2 = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id,
      question: 'Tôi muốn mua 2 chai'
    });
    assert.strictEqual(step2.found, true);
    assert.ok(step2.reply.includes('Họ tên, Địa chỉ nhận hàng và Số điện thoại'));

    // Bước 3: Khách cung cấp thông tin liên hệ
    const step3 = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id,
      question: 'Nguyễn Văn A, 123 Lê Lợi Q1 TP.HCM, 0901234567'
    });
    assert.strictEqual(step3.found, true);
    assert.ok(step3.reply.includes('Họ tên: Nguyễn Văn A'));
    assert.ok(step3.reply.includes('0901234567'));
    assert.ok(step3.reply.includes('Thông tin đơn hàng:'));
    assert.ok(step3.reply.includes('Mời khách hàng check xem có sai sót gì không'));

    // Bước 4: Khách chốt đơn "không có sai sót" -> Trừ kho, gửi lời cảm ơn và hỏi mua thêm
    const step4 = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id,
      question: 'không có sai sót'
    });
    assert.strictEqual(step4.found, true);
    assert.strictEqual(step4.is_order, true);
    assert.ok(step4.reply.includes('CẢM ƠN anh/chị'));
    assert.ok(step4.reply.includes('đóng gói để gửi cho mình sớm nhất'));
    assert.ok(step4.reply.includes('quan tâm đến bất kỳ sản phẩm nào khác'));
    assert.ok(step4.reply.includes('vui lòng liên hệ lại với em'));
  });

  it('5.1 Should smoothly switch to consulting another product even if previously asked to buy', async () => {
    const session_id = 'test_session_switch_product';

    // Khách lúc đầu bảo muốn mua
    await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id,
      question: 'Tôi muốn mua 2 chai'
    });

    // Sau đó khách hỏi thông tin sản phẩm khác: "Cho tôi hỏi sản phẩm Bugi Denso còn không ạ"
    const consultResponse = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      session_id,
      question: 'Cho tôi hỏi sản phẩm Bugi Denso còn không ạ'
    });

    assert.strictEqual(consultResponse.found, true);
    assert.ok(consultResponse.reply.includes('CÒN HÀNG'));
    assert.ok(consultResponse.reply.includes('Bugi Denso'));
    assert.ok(consultResponse.reply.includes('Giá bán:'));
    assert.strictEqual(consultResponse.reply.includes('Tồn kho hiện tại:'), false);
    assert.strictEqual(consultResponse.reply.includes('Vị trí kho:'), false);
  });

  it('6. Should generate accurate daily sales report & export updated Excel inventory', async () => {
    const shopReportService = require('../../src/services/inventory/shopReport.service');

    // 1. Kiểm tra tính toán báo cáo bán hàng trong ngày
    const report = await shopReportService.generateDailySalesReport(sampleShopId);
    assert.strictEqual(report.shop_id, sampleShopId);
    assert.strictEqual(report.total_items_sold >= 2, true);
    assert.strictEqual(report.total_revenue > 0, true);
    assert.strictEqual(report.sold_products.length >= 1, true);

    // 2. Kiểm tra xuất file Trang Tính Excel 2 Sheet (Tồn kho thực tế + Doanh thu chi tiết)
    const excelResult = await shopReportService.exportUpdatedInventoryExcel(sampleShopId);
    assert.strictEqual(excelResult.success, true);
    assert.ok(excelResult.download_url.includes('trang_tinh_kho_doanh_thu_'));
    assert.deepStrictEqual(excelResult.sheet_names, ['TonKhoThucTe', 'DoanhThu_ChiTiet']);
    assert.ok(excelResult.buffer.length > 100);

    // 3. Kiểm tra Chatbot trả lời báo cáo cho Chủ Shop
    const botReport = await shopChatbotService.answerCustomerQuestion({
      shop_id: sampleShopId,
      question: 'Hôm nay tôi bán được bao nhiêu sản phẩm và doanh thu bao nhiêu?'
    });
    assert.strictEqual(botReport.found, true);
    assert.strictEqual(botReport.is_report, true);
    assert.ok(botReport.reply.includes('BÁO CÁO BÁN HÀNG & DOANH THU HÔM NAY'));
    assert.ok(botReport.reply.includes('Tổng doanh thu hôm nay:'));
    assert.ok(botReport.reply.includes('File Excel tồn kho mới nhất'));
  });

});


