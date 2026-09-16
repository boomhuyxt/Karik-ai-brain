const { getEmbedding } = require('../../providers/gemini/embedding');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');

class ShopChatbotService {
  /**
   * Khách hàng hỏi thông tin sản phẩm và tình trạng tồn kho
   */
  async answerCustomerQuestion({ shop_id = 'default_shop', question }) {
    if (!question || !question.trim()) {
      return {
        reply: 'Dạ bạn cần tìm sản phẩm hoặc phụ tùng cho dòng xe nào ạ?'
      };
    }

    const cleanQuestion = question.trim();

    // 1. Sinh vector từ câu hỏi khách
    const queryVector = await getEmbedding(cleanQuestion);

    // 2. Tìm kiếm trong kho của Shop
    const matchedItems = await shopKnowledgeRepo.queryShopInventory(shop_id, queryVector, cleanQuestion);

    if (!matchedItems || matchedItems.length === 0) {
      return {
        found: false,
        shop_id,
        reply: `Dạ hiện tại shop chưa tìm thấy sản phẩm nào phù hợp với yêu cầu "${cleanQuestion}". Bạn có thể cho shop xin thêm thông tin đời xe để shop kiểm tra lại nhé!`,
        products: []
      };
    }

    // 3. Phân loại còn hàng / hết hàng
    const inStock = matchedItems.filter(i => Number(i.quantity || 0) > 0);
    const outOfStock = matchedItems.filter(i => Number(i.quantity || 0) <= 0);

    let reply = '';
    if (inStock.length > 0) {
      const top = inStock[0];
      reply = `Dạ bên em CÒN HÀNG sản phẩm "${top.name}" ạ!\n` +
        `• Dòng xe thích hợp: ${top.compatible_models || 'Tương thích tốt'}\n` +
        `• Tồn kho hiện tại: ${top.quantity} ${top.unit || 'chai'}\n` +
        `• Giá bán: ${Number(top.price || 0).toLocaleString('vi-VN')} VNĐ\n` +
        `• Vị trí kho: ${top.location || 'Kho hàng'}`;

      if (inStock.length > 1) {
        reply += `\n\nBên em còn có các loại khác cùng loại:\n` +
          inStock.slice(1, 3).map(i => `+ ${i.name} (Còn ${i.quantity} ${i.unit || 'cái'}) - ${Number(i.price || 0).toLocaleString('vi-VN')}đ`).join('\n');
      }
    } else {
      const topOut = outOfStock[0];
      reply = `Dạ sản phẩm "${topOut.name}" bên em hiện ĐÃ TẠM HẾT HÀNG trong kho rồi ạ. Bạn có muốn shop lưu thông tin để khi hàng về báo bạn ngay không ạ?`;
    }

    return {
      found: true,
      shop_id,
      reply,
      matched_count: matchedItems.length,
      products: inStock.concat(outOfStock)
    };
  }

  /**
   * Khách đặt mua / Chốt đơn -> Trừ kho và tạo thông báo cho Chủ Shop
   */
  async processOrderAndDeduct({ shop_id = 'default_shop', item_identifier, quantity = 1, customer_name, customer_phone }) {
    const reason = `Đơn hàng từ khách ${customer_name || 'Khách chat'} ${customer_phone ? `(SĐT: ${customer_phone})` : ''}`;
    const result = await shopKnowledgeRepo.deductStockAndNotify(shop_id, item_identifier, quantity, reason);

    const customerReply = `✅ Đã ghi nhận đơn hàng ${quantity} x "${result.item.name}".\n` +
      `Shop sẽ liên hệ đóng gói và gửi hàng sớm nhất cho bạn nhé!`;

    return {
      success: true,
      shop_id,
      customer_reply: customerReply,
      owner_alert: result.notification,
      updated_item: result.item
    };
  }

  /**
   * Lấy danh sách thông báo biến động kho gửi Chủ Shop
   */
  async getShopAlerts(shop_id = 'default_shop') {
    return await shopKnowledgeRepo.getNotifications(shop_id);
  }
}

module.exports = new ShopChatbotService();
