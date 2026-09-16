const { getEmbedding } = require('../../providers/gemini/embedding');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');

class ShopChatbotService {
  constructor() {
    // Lưu sản phẩm vừa thảo luận gần nhất của mỗi shop để hiểu ngữ cảnh khách nói "tôi muốn mua 1 cái"
    this.lastDiscussedShopProduct = new Map();
  }

  /**
   * Khách hàng hỏi thông tin sản phẩm hoặc đặt mua trực tiếp qua Chatbox
   */
  async answerCustomerQuestion({ shop_id = 'default_shop', question }) {
    if (!question || !question.trim()) {
      const allItems = await shopKnowledgeRepo.queryShopInventory(shop_id, null, '');
      return {
        found: true,
        reply: 'Dạ bạn cần tìm sản phẩm hoặc phụ tùng cho dòng xe nào ạ?',
        products: allItems
      };
    }

    const cleanQuestion = question.trim();

    // -------------------------------------------------------------
    // 1. NHẬN DIỆN Ý ĐỊNH ĐẶT MUA HÀNG (PURCHASE INTENT DETECTION)
    // -------------------------------------------------------------
    const buyRegex = /(mua|lấy|chốt|đặt|order|cho\s+anh|cho\s+em|cho\s+toi|giao\s+cho)/i;
    const isBuyIntent = buyRegex.test(cleanQuestion);

    if (isBuyIntent) {
      // Trích xuất số lượng khách muốn mua (VD: "mua 1 cái" -> 1, "lấy 2 chai" -> 2)
      const qtyMatch = cleanQuestion.match(/(\d+)\s*(cái|chai|bộ|bình|chiếc|viên|lon)?/i);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      // Tìm sản phẩm cần mua: Ưu tiên sản phẩm vừa thảo luận, nếu không thì tìm theo từ khóa
      let targetProduct = this.lastDiscussedShopProduct.get(shop_id);

      // Nếu trong câu có nhắc đến tên sản phẩm khác, tìm kiếm lại
      const directMatches = await shopKnowledgeRepo.queryShopInventory(shop_id, null, cleanQuestion);
      if (directMatches.length > 0 && directMatches[0].score >= 0.35) {
        targetProduct = directMatches[0];
      }

      if (targetProduct) {
        try {
          const orderResult = await this.processOrderAndDeduct({
            shop_id,
            item_identifier: targetProduct.sku || targetProduct.name,
            quantity: quantity,
            customer_name: 'Khách chat trực tiếp'
          });

          return {
            found: true,
            is_order: true,
            shop_id,
            reply: `🎉 ${orderResult.customer_reply}\n\n` +
                   `• Sản phẩm: ${targetProduct.name}\n` +
                   `• Số lượng: ${quantity} ${targetProduct.unit || 'cái'}\n` +
                   `• Tổng tiền: ${Number((targetProduct.price || 0) * quantity).toLocaleString('vi-VN')} VNĐ\n` +
                   `• Tồn kho còn lại: ${orderResult.updated_item.quantity} ${targetProduct.unit || 'cái'}.\n` +
                   `🔔 Hệ thống đã tự động trừ kho và gửi thông báo biến động kho đến Chủ Shop!`,
            order: orderResult
          };
        } catch (err) {
          return {
            found: false,
            shop_id,
            reply: `Dạ sản phẩm "${targetProduct.name}" hiện không đủ số lượng để đặt (hoặc đã hết hàng). Bạn có muốn chọn sản phẩm khác không ạ?`
          };
        }
      }
    }

    // -------------------------------------------------------------
    // 2. TRA CỨU TỒN KHO & TƯ VẤN SẢN PHẨM (HYBRID RAG SEARCH)
    // -------------------------------------------------------------
    const queryVector = await getEmbedding(cleanQuestion);
    const matchedItems = await shopKnowledgeRepo.queryShopInventory(shop_id, queryVector, cleanQuestion);

    if (!matchedItems || matchedItems.length === 0) {
      return {
        found: false,
        shop_id,
        reply: `Dạ hiện tại shop chưa tìm thấy sản phẩm nào phù hợp với yêu cầu "${cleanQuestion}". Bạn có thể cho shop xin thêm thông tin đời xe để shop kiểm tra lại nhé!`,
        products: []
      };
    }

    // Lưu sản phẩm top đầu vào bộ nhớ đệm ngữ cảnh
    this.lastDiscussedShopProduct.set(shop_id, matchedItems[0]);

    const inStock = matchedItems.filter(i => Number(i.quantity || 0) > 0);
    const outOfStock = matchedItems.filter(i => Number(i.quantity || 0) <= 0);

    let reply = '';
    if (inStock.length > 0) {
      const top = inStock[0];
      reply = `Dạ bên em CÒN HÀNG sản phẩm "${top.name}" ạ!\n` +
        `• Dòng xe thích hợp: ${top.compatible_models || 'Tương thích tốt'}\n` +
        `• Tồn kho hiện tại: ${top.quantity} ${top.unit || 'cái'}\n` +
        `• Giá bán: ${Number(top.price || 0).toLocaleString('vi-VN')} VNĐ\n` +
        `• Vị trí kho: ${top.location || 'Kho hàng'}`;

      if (inStock.length > 1) {
        reply += `\n\nBên em còn có thêm các mặt hàng tương tự:\n` +
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
