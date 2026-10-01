const { describe, it } = require('node:test');
const assert = require('node:assert');
const shopChatbotService = require('../../src/services/ai/shopChatbot.service');
const shopKnowledgeRepo = require('../../src/repositories/shopKnowledge.repository');

describe('--- Customer Chat Contact & Post Office Order Flow Suite ---', () => {
  const testShopId = `shop_test_contact_${Date.now()}`;
  const testFileId = `file_test_contact_${Date.now()}`;

  // Seed inventory data
  shopKnowledgeRepo.memoryFiles.set(testFileId, {
    id: testFileId,
    shop_id: testShopId,
    file_name: 'test_products.xlsx',
    file_path: 'https://test.supabase.co/storage/v1/object/public/kho/test.xlsx',
    inventory_data: [
      {
        id: 'SP01',
        sku: 'NHOT-CASTROL-08',
        name: 'Nhớt Castrol Power 1 0.8L',
        quantity: 20,
        price: 120000,
        unit: 'chai',
        compatible_models: 'Honda Wave, Blade, Future'
      },
      {
        id: 'SP02',
        sku: 'BUGI-NGK-CPR6',
        name: 'Bugi NGK CPR6EA-9',
        quantity: 15,
        price: 55000,
        unit: 'cái',
        compatible_models: 'Future 125, Wave RSX'
      }
    ],
    notifications: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  it('1. Should accurately extract customer contact with diverse phone formats and delimiters', () => {
    // Định dạng có chấm
    const c1 = shopChatbotService.extractCustomerContact('Nguyễn Văn Nam, 123 Lê Lợi Quận 1 TP.HCM, 0908.123.456');
    assert.strictEqual(c1.phone, '0908123456');
    assert.strictEqual(c1.name, 'Nguyễn Văn Nam');
    assert.ok(c1.address.includes('123 Lê Lợi'));

    // Định dạng có nhãn xuống dòng
    const c2 = shopChatbotService.extractCustomerContact(
      'Họ tên: Trần Thị Mai\nSố điện thoại: 0987 654 321\nĐịa chỉ: Số 45 ngõ 10 đường Giải Phóng, Hà Nội'
    );
    assert.strictEqual(c2.phone, '0987654321');
    assert.strictEqual(c2.name, 'Trần Thị Mai');
    assert.ok(c2.address.includes('45 ngõ 10 đường Giải Phóng'));

    // Định dạng tiền tố +84
    const c3 = shopChatbotService.extractCustomerContact('Lê Văn Hùng, +84912345678, 88 Trần Phú Nha Trang');
    assert.strictEqual(c3.phone, '0912345678');
    assert.strictEqual(c3.name, 'Lê Văn Hùng');
    assert.ok(c3.address.includes('88 Trần Phú Nha Trang'));
  });

  it('2. When customer messages Name, Address, and Phone -> AI automatically records order and forwards to Bưu Cục Kho', async () => {
    const sessionId = `session_${Date.now()}_01`;

    // Khách hỏi sản phẩm trước
    const askRes = await shopChatbotService.answerCustomerQuestion({
      shop_id: testShopId,
      session_id: sessionId,
      question: 'Nhớt Castrol Power 1 0.8L còn hàng không?'
    });
    assert.strictEqual(askRes.found, true);

    // Khách gửi thông tin: Tên, Địa chỉ, Số điện thoại để chốt đơn
    const orderRes = await shopChatbotService.answerCustomerQuestion({
      shop_id: testShopId,
      session_id: sessionId,
      question: 'Nguyễn Văn Nam, 123 Lê Lợi Q1 TP.HCM, 0908.123.456'
    });

    assert.strictEqual(orderRes.found, true);
    assert.strictEqual(orderRes.is_order, true);
    assert.ok(orderRes.reply.includes('Họ tên: Nguyễn Văn Nam'));
    assert.ok(orderRes.reply.includes('0908123456'));
    assert.ok(orderRes.reply.includes('123 Lê Lợi'));
    assert.ok(orderRes.reply.includes('chuyển thông tin cho bưu cục kho'));

    // Kiểm tra Bưu Cục Kho đã nhận được đơn hàng chưa
    const postOfficeOrders = await shopKnowledgeRepo.getAllOrders();
    const recordedOrder = postOfficeOrders.find(o => o.customer_phone === '0908123456');

    assert.ok(recordedOrder, 'Đơn hàng phải được chuyển sang danh sách Bưu Cục Kho');
    assert.strictEqual(recordedOrder.customer_name, 'Nguyễn Văn Nam');
    assert.strictEqual(recordedOrder.customer_phone, '0908123456');
    assert.ok(recordedOrder.customer_address.includes('123 Lê Lợi'));
    assert.ok(recordedOrder.tracking_number.startsWith('VN'));
    assert.strictEqual(recordedOrder.order_status, 'PENDING');
  });

  it('3. When customer sends contact info first without product -> AI saves contact and finalizes when product is picked', async () => {
    const sessionId = `session_${Date.now()}_02`;

    // Khách nhắn Tên, SĐT, Địa chỉ trước
    const step1 = await shopChatbotService.answerCustomerQuestion({
      shop_id: testShopId,
      session_id: sessionId,
      question: 'Họ tên: Hoàng Long, sđt 0933112233, địa chỉ 77 Hai Bà Trưng Đà Nẵng'
    });

    assert.strictEqual(step1.found, true);
    assert.ok(step1.reply.includes('ghi nhận thông tin nhận hàng'));
    assert.ok(step1.reply.includes('Hoàng Long'));
    assert.ok(step1.reply.includes('0933112233'));

    // Sau đó khách chọn sản phẩm cần mua
    const step2 = await shopChatbotService.answerCustomerQuestion({
      shop_id: testShopId,
      session_id: sessionId,
      question: 'Cho mình lấy 2 cái bugi NGK'
    });

    assert.strictEqual(step2.found, true);
    assert.strictEqual(step2.is_order, true);
    assert.ok(step2.reply.includes('Hoàng Long'));
    assert.ok(step2.reply.includes('0933112233'));
    assert.ok(step2.reply.includes('chuyển thông tin cho bưu cục kho'));

    // Bưu Cục Kho nhận được đơn này
    const postOfficeOrders = await shopKnowledgeRepo.getAllOrders();
    const recordedOrder = postOfficeOrders.find(o => o.customer_phone === '0933112233');

    assert.ok(recordedOrder, 'Đơn hàng 2 cái bugi phải có trong Bưu Cục');
    assert.strictEqual(recordedOrder.customer_name, 'Hoàng Long');
    assert.strictEqual(recordedOrder.quantity_sold, 2);
  });
});
