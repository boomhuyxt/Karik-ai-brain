const { getEmbedding } = require('../../providers/gemini/embedding');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');
const shopReportService = require('../inventory/shopReport.service');

class ShopChatbotService {
  constructor() {
    // Quản lý phiên hội thoại theo shop (hoặc sessionId)
    // Cấu trúc: { state, draftOrder, lastDiscussedProduct }
    this.sessions = new Map();
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        state: 'IDLE',
        draftOrder: null,
        lastDiscussedProduct: null
      });
    }
    return this.sessions.get(sessionId);
  }

  resetSession(sessionId) {
    this.sessions.set(sessionId, {
      state: 'IDLE',
      draftOrder: null,
      lastDiscussedProduct: null
    });
  }

  /**
   * Trích xuất thông tin khách hàng từ tin nhắn (SĐT, Họ tên, Địa chỉ)
   */
  extractCustomerContact(text) {
    if (!text) return null;
    const clean = text.trim();

    // Tìm số điện thoại (10-11 chữ số, bắt đầu bằng 0 hoặc +84)
    const phoneRegex = /(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5|8|9]|9[0-4|6-9])[0-9]{7}/g;
    const phoneMatches = clean.match(phoneRegex);
    const phone = phoneMatches ? phoneMatches[0] : null;

    if (!phone) return null;

    // Phân tách phần còn lại để lấy Tên và Địa chỉ
    let remaining = clean.replace(phone, '').replace(/[,\-\|\;]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Thử tách theo định dạng phổ biến: "Tên, Địa chỉ, SĐT" hoặc "Anh/Chị Tên, Địa chỉ"
    const parts = text.split(/[,\n\r]+/).map(p => p.trim()).filter(p => p && !p.includes(phone));
    
    let name = 'Khách hàng';
    let address = 'Tại shop / Chưa cung cấp chi tiết';

    if (parts.length >= 2) {
      name = parts[0];
      address = parts.slice(1).join(', ');
    } else if (parts.length === 1) {
      // Nếu viết liền không phẩy: "Anh Nam 123 Lê Lợi Q1 HCM 0912345678"
      const words = remaining.split(' ');
      if (words.length >= 2 && /^(anh|chị|em|bác|chú|cô|bạn)/i.test(words[0])) {
        name = words.slice(0, 2).join(' ');
        address = words.slice(2).join(' ') || address;
      } else if (words.length >= 3) {
        name = words.slice(0, 2).join(' ');
        address = words.slice(2).join(' ') || address;
      } else if (words.length > 0) {
        name = remaining;
      }
    }

    return {
      name: name.replace(/^(tên|họ tên|mình là|tôi là|anh|chị|em)\s*[:\-]?\s*/i, '').trim() || 'Khách hàng',
      phone,
      address: address.replace(/^(địa chỉ|ở|tại|giao về|giao đến)\s*[:\-]?\s*/i, '').trim() || 'Theo thỏa thuận'
    };
  }

  /**
   * Khách hàng hỏi thông tin sản phẩm hoặc đặt mua trực tiếp qua Chatbox
   */
  async answerCustomerQuestion({ shop_id = 'default_shop', question, session_id }) {
    const sid = session_id || shop_id;
    const session = this.getSession(sid);

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
    // BƯỚC 0: CHỦ SHOP HỎI BÁO CÁO DOANH THU & XUẤT FILE EXCEL KHO
    // -------------------------------------------------------------
    const reportRegex = /(hôm nay.*(bán được|doanh thu|bán bao nhiêu|bao nhiêu sản phẩm|tiền bán)|doanh thu|báo cáo.*(doanh thu|bán hàng|kho|tổng quan)|tồn kho.*(còn lại|bao nhiêu|thế nào|hiện tại)|tổng quan.*kho|xuất.*(file|excel|báo cáo)|tải.*(file|excel|báo cáo)|thống kê.*(bán hàng|kho|doanh thu)|giá trị tồn kho)/i;

    if (reportRegex.test(cleanQuestion)) {
      try {
        const report = await shopReportService.generateDailySalesReport(shop_id);
        const excel = await shopReportService.exportUpdatedInventoryExcel(shop_id);

        let reportText = `📊 **BÁO CÁO BÁN HÀNG & DOANH THU HÔM NAY (Shop: ${shop_id})**\n\n` +
          `💰 **Tổng doanh thu hôm nay:** ${report.total_revenue.toLocaleString('vi-VN')} VNĐ\n` +
          `📦 **Tổng số lượng đã bán:** ${report.total_items_sold} mặt hàng (${report.total_orders} đơn hàng)\n\n`;

        if (report.sold_products.length > 0) {
          reportText += `📋 **Chi tiết sản phẩm đã bán hôm nay:**\n` +
            report.sold_products.map(p => `• ${p.name}: **${p.quantity_sold} ${p.unit}** ➔ Doanh thu: ${p.total_revenue.toLocaleString('vi-VN')}đ (Tồn kho còn lại: ${p.remaining_quantity ?? '-'} ${p.unit})`).join('\n') + `\n\n`;
        } else {
          reportText += `📋 Hôm nay chưa phát sinh giao dịch bán hàng nào.\n\n`;
        }

        if (report.inventory_summary.out_of_stock_count > 0 || report.inventory_summary.low_stock_count > 0) {
          reportText += `⚠️ **Cảnh báo kho hàng:**\n`;
          if (report.inventory_summary.out_of_stock_count > 0) {
            reportText += `• 🚨 ${report.inventory_summary.out_of_stock_count} sản phẩm ĐÃ HẾT HÀNG: ` +
              report.inventory_summary.out_of_stock_items.map(i => `"${i.name}" (0 ${i.unit || 'cái'})`).join(', ') + `\n`;
          }
          if (report.inventory_summary.low_stock_count > 0) {
            reportText += `• ⚠️ ${report.inventory_summary.low_stock_count} sản phẩm SẮP HẾT: ` +
              report.inventory_summary.low_stock_items.map(i => `"${i.name}" (còn ${i.quantity} ${i.unit || 'cái'})`).join(', ') + `\n`;
          }
          reportText += `\n`;
        }

        reportText += `📥 **File Excel tồn kho mới nhất (đã tự động trừ kho):**\n` +
          `👉 [Tải File Excel Cập Nhật](${excel.download_url})`;

        return {
          found: true,
          is_report: true,
          shop_id,
          reply: reportText,
          report,
          excel_url: excel.download_url
        };
      } catch (err) {
        return {
          found: false,
          shop_id,
          reply: `Dạ không thể tạo báo cáo cho shop "${shop_id}": ${err.message}`
        };
      }
    }

    // -------------------------------------------------------------
    // BƯỚC 4: KHÁCH HÀNG XÁC NHẬN CHỐT ĐƠN (CONFIRMATION)
    // -------------------------------------------------------------
    if (session.state === 'AWAITING_CONFIRMATION') {
      const confirmRegex = /(ok|oke|okie|okay|đúng rồi|đúng|chốt|chốt đơn|chuẩn|chuẩn rồi|chính xác|đồng ý|gửi đi|gửi hàng|lên đơn|lên đơn đi|lên đơn giúp|tiến hành|vâng|được|yes|yep|yup|không có sai sót|không sai sót|không sai|đầy đủ rồi|đúng thông tin|chuẩn xác)/i;
      const cancelRegex = /(hủy|không mua|đổi ý|thôi|khoan|dừng)/i;

      if (confirmRegex.test(cleanQuestion)) {
        const draft = session.draftOrder;
        if (draft && draft.item) {
          try {
            const orderResult = await this.processOrderAndDeduct({
              shop_id,
              item_identifier: draft.item.sku || draft.item.name,
              quantity: draft.quantity,
              customer_name: draft.customer_name,
              customer_phone: draft.customer_phone,
              customer_address: draft.customer_address
            });

            // Reset trạng thái sau khi chốt thành công
            session.state = 'COMPLETED';
            session.draftOrder = null;

            const total = Number(draft.item.price || 0) * draft.quantity;
            return {
              found: true,
              is_order: true,
              shop_id,
              reply: `🎉 Dạ shop xin chân thành CẢM ƠN anh/chị đã tin tưởng và ủng hộ shop ạ!\n\n` +
                     `📦 Shop đã tiếp nhận thông tin và đang tiến hành lên đơn đóng gói để gửi cho mình sớm nhất:\n` +
                     `• Sản phẩm: ${draft.item.name}\n` +
                     `• Số lượng: ${draft.quantity} ${draft.item.unit || 'cái'}\n` +
                     `• Tổng thanh toán: ${total.toLocaleString('vi-VN')} VNĐ (Thu hộ khi nhận hàng)\n` +
                     `• Người nhận: ${draft.customer_name} - ${draft.customer_phone}\n` +
                     `• Địa chỉ giao: ${draft.customer_address}\n\n` +
                     `👉 Nếu anh/chị có quan tâm đến bất kỳ sản phẩm nào khác bên shop, vui lòng liên hệ lại với em để em hỗ trợ tư vấn và lên đơn chung cho mình nhé ạ! Chúc anh/chị một ngày thật vui vẻ! 😊`,
              order: orderResult
            };
          } catch (err) {
            session.state = 'IDLE';
            return {
              found: false,
              shop_id,
              reply: `Dạ rất tiếc sản phẩm "${draft.item.name}" vừa hết hàng hoặc không đủ tồn kho để xuất. Bạn có muốn tham khảo sản phẩm khác không ạ?`
            };
          }
        }
      } else if (cancelRegex.test(cleanQuestion)) {
        this.resetSession(sid);
        return {
          found: true,
          shop_id,
          reply: `Dạ em đã hủy thông tin lên đơn này. Anh/chị cần hỗ trợ tìm kiếm sản phẩm nào khác thì cứ nhắn em nhé!`
        };
      }
    }

    // -------------------------------------------------------------
    // BƯỚC 3: NHẬN THÔNG TIN KHÁCH HÀNG (COLLECTING CONTACT & PREVIEW BILL)
    // -------------------------------------------------------------
    const contactInfo = this.extractCustomerContact(cleanQuestion);

    if (contactInfo) {
      let draft = session.draftOrder;
      if (!draft && session.lastDiscussedProduct) {
        draft = {
          item: session.lastDiscussedProduct,
          quantity: 1
        };
      }

      if (draft && draft.item) {
        draft.customer_name = contactInfo.name;
        draft.customer_phone = contactInfo.phone;
        draft.customer_address = contactInfo.address;
        session.draftOrder = draft;
        session.state = 'AWAITING_CONFIRMATION';

        const totalMoney = Number(draft.item.price || 0) * draft.quantity;

        const replyBill = 
`Họ tên: ${draft.customer_name}
Địa chỉ: ${draft.customer_address}
Sđt: ${draft.customer_phone}
Thông tin đơn hàng:
(Tên sản phẩm: ${draft.item.name}
Số lượng: ${draft.quantity} ${draft.item.unit || 'cái'} X ${Number(draft.item.price || 0).toLocaleString('vi-VN')} VNĐ = ${totalMoney.toLocaleString('vi-VN')} VNĐ)

Mời khách hàng check xem có sai sót gì không để lên đơn cho khách hàng.`;

        return {
          found: true,
          shop_id,
          reply: replyBill
        };
      }
    }

    // Nếu đang ở trạng thái chờ thông tin nhưng khách gửi câu hỏi tra cứu sản phẩm hoặc đổi ý mua món khác -> Chuyển về tư vấn
    const isProductInquiry = /(hỏi|còn|hết|có không|giá|bao nhiêu|xem|tư vấn|sản phẩm|nhớt|bugi|lốp|vỏ|má phanh|phụ tùng|bình|lọc|xe|chai|cái|chiếc|bộ)/i.test(cleanQuestion);
    if (session.state === 'AWAITING_CUSTOMER_INFO' && !isProductInquiry) {
      const buyRegex = /(mua|lấy|chốt|đặt|order|cho\s+anh|cho\s+em|cho\s+toi|giao\s+cho|ship\s+cho)/i;
      if (!buyRegex.test(cleanQuestion)) {
        return {
          found: true,
          shop_id,
          reply: `Dạ để em lên đơn chuẩn xác, anh/chị vui lòng cung cấp đủ theo mẫu: Họ tên, Địa chỉ nhận hàng và Số điện thoại nhé ạ!\n(Ví dụ: "Nguyễn Văn A, 123 Lê Lợi Q1 HCM, 0901234567")\n\nHoặc anh/chị có thể nhắn tên sản phẩm khác để em tư vấn thêm ạ!`
        };
      }
    }

    // -------------------------------------------------------------
    // BƯỚC 2: NHẬN DIỆN Ý ĐỊNH ĐẶT MUA HÀNG (PURCHASE INTENT DETECTION)
    // -------------------------------------------------------------
    const buyRegex = /(mua|lấy|chốt|đặt|order|cho\s+anh|cho\s+em|cho\s+toi|giao\s+cho|ship\s+cho)/i;
    const isBuyIntent = buyRegex.test(cleanQuestion);

    if (isBuyIntent) {
      // Trích xuất số lượng khách muốn mua (VD: "mua 2 cái" -> 2, "lấy 1 chai" -> 1)
      const qtyMatch = cleanQuestion.match(/(\d+)\s*(cái|chai|bộ|bình|chiếc|viên|lon)?/i);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      // Xác định sản phẩm mục tiêu: Ưu tiên sản phẩm đang thảo luận trong phiên
      let targetProduct = session.lastDiscussedProduct;

      // Chỉ chuyển sang sản phẩm khác nếu khách gọi đích danh tên/mã sản phẩm mới (không phải các câu mua chung chung như "tôi muốn mua 34 chai")
      const junkRegex = /^(ghi chú|lưu ý|hướng dẫn|chú ý|tổng cộng|header|footer|note|cảnh báo|ô tồn kho)\b/i;
      const strippedQuestion = cleanQuestion.replace(/(tôi|mình|em|anh|chị|muốn|cần|mua|lấy|chốt|đặt|order|cho|giao|ship|cái|chai|bộ|bình|chiếc|viên|lon|\d+|\s+)/gi, ' ').trim();
      
      if (strippedQuestion.length >= 3) {
        const directMatches = await shopKnowledgeRepo.queryShopInventory(shop_id, null, strippedQuestion);
        const validMatches = directMatches.filter(m => !junkRegex.test(m.name || ''));
        if (validMatches.length > 0 && (validMatches[0].score || 0) >= 0.75) {
          targetProduct = validMatches[0];
        }
      }

      if (!targetProduct) {
        const allItems = await shopKnowledgeRepo.queryShopInventory(shop_id, null, '');
        const validItems = allItems.filter(m => !junkRegex.test(m.name || ''));
        if (validItems.length > 0) {
          targetProduct = validItems[0];
        }
      }

      if (targetProduct) {
        const availableQty = Number(targetProduct.quantity || 0);
        if (availableQty < quantity) {
          return {
            found: true,
            shop_id,
            reply: `Dạ sản phẩm "${targetProduct.name}" bên em hiện chỉ còn ${availableQty} ${targetProduct.unit || 'cái'} trong kho thôi ạ.\n\n` +
                   `Nếu anh/chị muốn mua đủ số lượng ${quantity} ${targetProduct.unit || 'cái'}, vui lòng đợi thêm vài ngày để shop nhập kho nhé ạ!\n\n` +
                   `👉 Anh/chị muốn tham khảo sản phẩm khác, hay muốn mua sản phẩm này với số lượng tồn kho (${availableQty} ${targetProduct.unit || 'cái'}) ạ?\n` +
                   `Vui lòng cho em xin thông tin (Họ tên, Địa chỉ, SĐT) hoặc nhắn tin để em thực hiện lên đơn/tư vấn khách hàng đặt đơn hàng khác nhé!`
          };
        }

        // Lưu thông tin đơn nháp vào phiên
        session.draftOrder = {
          item: targetProduct,
          quantity: quantity
        };
        session.state = 'AWAITING_CUSTOMER_INFO';

        return {
          found: true,
          shop_id,
          reply: `Dạ bên em đã ghi nhận anh/chị muốn đặt mua ${quantity} ${targetProduct.unit || 'cái'} "${targetProduct.name}".\n\n` +
                 `Để lên đơn cho mình, anh/chị vui lòng cho em xin Họ tên, Địa chỉ nhận hàng và Số điện thoại nhé ạ!`
        };
      }
    }

    // -------------------------------------------------------------
    // BƯỚC 1: TRA CỨU TỒN KHO & TƯ VẤN SẢN PHẨM (HYBRID RAG SEARCH)
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

    // Lọc trùng lặp (Deduplicate) theo tên và SKU, đồng thời loại bỏ dòng rác ghi chú
    const junkRegex = /^(ghi chú|lưu ý|hướng dẫn|chú ý|tổng cộng|header|footer|note|cảnh báo|ô tồn kho)\b/i;
    const seenNames = new Set();
    const uniqueItems = [];
    for (const item of matchedItems) {
      if (junkRegex.test(item.name || '')) continue;
      const norm = (item.name || '').toLowerCase().trim();
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        uniqueItems.push(item);
      }
    }

    if (uniqueItems.length === 0) {
      return {
        found: false,
        shop_id,
        reply: `Dạ hiện tại shop chưa tìm thấy sản phẩm nào phù hợp với yêu cầu "${cleanQuestion}". Bạn có thể cho shop xin thêm thông tin đời xe để shop kiểm tra lại nhé!`,
        products: []
      };
    }

    const inStock = uniqueItems.filter(i => Number(i.quantity || 0) > 0);
    const outOfStock = uniqueItems.filter(i => Number(i.quantity || 0) <= 0);

    const topProduct = uniqueItems[0];
    session.lastDiscussedProduct = topProduct;

    let reply = '';
    if (Number(topProduct.quantity || 0) > 0) {
      reply = `Dạ bên em CÒN HÀNG sản phẩm "${topProduct.name}" ạ!\n` +
        `• Dòng xe thích hợp: ${topProduct.compatible_models || 'Tương thích tiêu chuẩn'}\n` +
        `• Giá bán: ${Number(topProduct.price || 0).toLocaleString('vi-VN')} VNĐ\n\n` +
        `👉 Anh/chị có muốn đặt mua sản phẩm này không ạ?`;

      // Các mặt hàng tương tự khác (không hiển thị số lượng tồn kho nội bộ)
      const similarInStock = inStock.filter(i => (i.name || '').toLowerCase().trim() !== (topProduct.name || '').toLowerCase().trim());
      if (similarInStock.length > 0) {
        reply += `\n\nBên em còn có thêm các mặt hàng tương tự:\n` +
          similarInStock.slice(0, 2).map(i => `+ ${i.name} - ${Number(i.price || 0).toLocaleString('vi-VN')}đ`).join('\n');
      }
    } else {
      reply = `Dạ sản phẩm "${topProduct.name}" bên em hiện ĐÃ TẠM HẾT HÀNG trong kho rồi ạ. Anh/chị có muốn tham khảo sản phẩm tương đương không ạ?`;
    }

    return {
      found: true,
      shop_id,
      reply,
      matched_count: uniqueItems.length,
      products: uniqueItems
    };
  }

  /**
   * Khách đặt mua / Chốt đơn -> Trừ kho và tạo thông báo cho Chủ Shop
   */
  async processOrderAndDeduct({ shop_id = 'default_shop', item_identifier, quantity = 1, customer_name, customer_phone, customer_address }) {
    const reason = `Đơn hàng từ khách ${customer_name || 'Khách chat'} ${customer_phone ? `(SĐT: ${customer_phone})` : ''} ${customer_address ? `[Đ/C: ${customer_address}]` : ''}`;
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

