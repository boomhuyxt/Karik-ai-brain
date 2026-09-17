const XLSX = require('xlsx');
const chatFileHandlerService = require('../src/services/ai/chatFileHandler.service');
const shopChatbotService = require('../src/services/ai/shopChatbot.service');
const shopKnowledgeRepo = require('../src/repositories/shopKnowledge.repository');

async function runDemo() {
  console.log('\n======================================================');
  console.log('🤖 DEMO TOÀN TRÌNH: AI QUẢN LÝ KHO & BÁN HÀNG ĐA SHOP');
  console.log('======================================================\n');

  const shopId = 'shop_xe_may_01';

  // 1. CHỦ SHOP NẠP FILE EXCEL VÀO CHATBOX
  console.log('📦 [BƯỚC 1] CHỦ SHOP GỬI FILE EXCEL KHO HÀNG QUA CHATBOX...');
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

  const uploadResult = await chatFileHandlerService.handleChatFileUpload({
    shop_id: shopId,
    fileName: 'kho_nhot_wave_thang9.xlsx',
    base64Data: base64Data
  });

  console.log('   ✅ Phản hồi Bot:', uploadResult.message);
  console.log('   📊 Tổng số sản phẩm nhận diện:', uploadResult.total_items);

  // 2. KHÁCH HÀNG CHAT HỎI TỒN KHO
  console.log('\n💬 [BƯỚC 2] KHÁCH HÀNG CHAT HỎI AI:');
  const customerQuestion = 'Shop ơi có chai nhớt nào dùng cho xe Wave không, còn hàng không?';
  console.log(`   Khách: "${customerQuestion}"`);

  const chatResponse = await shopChatbotService.answerCustomerQuestion({
    shop_id: shopId,
    question: customerQuestion
  });

  console.log('   🤖 AI Trả lời:');
  console.log(chatResponse.reply.split('\n').map(l => '      ' + l).join('\n'));

  // 3. KHÁCH HÀNG CHỐT ĐƠN -> TRỪ KHO
  console.log('\n🛒 [BƯỚC 3] KHÁCH HÀNG CHỐT ĐƠN MUA 2 CHAI...');
  const orderResult = await shopChatbotService.processOrderAndDeduct({
    shop_id: shopId,
    item_identifier: 'CASTROL-WAVE-08',
    quantity: 2,
    customer_name: 'Anh Nam',
    customer_phone: '0901234567'
  });

  console.log('   ✅ Phản hồi khách hàng:', orderResult.customer_reply);
  console.log(`   📉 Tồn kho mới: ${orderResult.updated_item.quantity} (giảm từ 10 xuống ${orderResult.updated_item.quantity})`);

  // 4. CHỦ SHOP XEM LỊCH SỬ BIẾN ĐỘNG KHO
  console.log('\n🔔 [BƯỚC 4] CHUÔNG BÁO BIẾN ĐỘNG KHO GỬI CHỦ SHOP:');
  const alerts = await shopChatbotService.getShopAlerts(shopId);
  console.log(`   Tìm thấy ${alerts.length} thông báo:`);
  alerts.forEach((alert, idx) => {
    console.log(`   ${idx + 1}. [${alert.level}] ${alert.message} (Tồn còn: ${alert.remaining_stock})`);
  });

  console.log('\n======================================================');
  console.log('✨ HOÀN TẤT DEMO TOÀN TRÌNH THÀNH CÔNG!');
  console.log('======================================================\n');
}

runDemo().catch(err => {
  console.error('❌ Lỗi chạy demo:', err);
  process.exit(1);
});
