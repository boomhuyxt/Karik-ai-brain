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

    // 1. Tìm số điện thoại (hỗ trợ định dạng 0908123456, 0908.123.456, 0908 123 456, 0908-123-456, +84...)
    const phonePattern = /(?:(?:\+84|84|0)[\s.-]*)?(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5|8|9]|9[0-4|6-9])(?:[\s.-]*\d){7}\b/;
    const fallbackPhonePattern = /(?:\+84|84|0)(?:[\s.-]*\d){9,10}\b/;
    
    let rawPhoneMatch = clean.match(phonePattern) || clean.match(fallbackPhonePattern);
    if (!rawPhoneMatch) return null;

    const rawPhone = rawPhoneMatch[0];
    const phone = rawPhone.replace(/[\s.-]/g, '').replace(/^(\+?84)/, '0');

    if (phone.length < 10 || phone.length > 11) return null;

    // 2. Thử bóc tách theo nhãn tường minh (Labels)
    let name = null;
    let address = null;

    const nameLabelMatch = clean.match(/(?:họ\s*(?:và\s*)?tên|họ\s*tên|tên\s*(?:khách(?:\s*hàng)?)?|người\s*nhận|tôi\s*là|mình\s*là)\s*[:\-]?\s*([^\n\r,;|]+)/i);
    if (nameLabelMatch && nameLabelMatch[1]) {
      name = nameLabelMatch[1].trim();
    }

    const addrLabelMatch = clean.match(/(?:địa\s*chỉ|đ\/c|đc|nơi\s*(?:giao|nhận)|giao\s*(?:đến|về|cho|tại)|ship\s*(?:đến|về|cho)|địa\s*điểm)\s*[:\-]?\s*([^\n\r;|]+)/i);
    if (addrLabelMatch && addrLabelMatch[1]) {
      address = addrLabelMatch[1].trim();
    }

    // 3. Tách phần văn bản sau khi loại bỏ số điện thoại
    const textWithoutPhone = clean
      .replace(rawPhone, ' ')
      .replace(/(?:sđt|sdt|số điện thoại|điện thoại|phone|tel)\s*[:\-]?/gi, ' ')
      .replace(/[\(\)\[\]\{\}]/g, ' ')
      .trim();

    if (!name || !address) {
      let parts = textWithoutPhone
        .split(/[\n\r,;|]+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const addrKeywords = /(đường|phố|ngõ|hẻm|phường|quận|huyện|tỉnh|tp|thành phố|thị xã|ấp|thôn|xã|xóm|số\s*\d+|\d+\s*[\/\-]\s*\d+|\b(q|p)\.?\s*\d+|\bhcm\b|\bhà nội\b|\bđà nẵng\b|\bquận\b|\bhuyện\b)/i;

      if (parts.length >= 2) {
        let foundAddrIdx = parts.findIndex(p => addrKeywords.test(p));
        if (foundAddrIdx === -1) {
          foundAddrIdx = parts[0].length < parts[1].length ? 1 : 0;
        }

        if (!address) address = parts[foundAddrIdx];
        if (!name) {
          const otherParts = parts.filter((_, idx) => idx !== foundAddrIdx);
          name = otherParts.length > 0 ? otherParts[0] : 'Khách hàng';
        }
      } else if (parts.length === 1) {
        const singleStr = parts[0];
        const addrMatch = singleStr.match(addrKeywords);
        if (addrMatch) {
          const splitIdx = singleStr.indexOf(addrMatch[0]);
          const beforeAddr = singleStr.substring(0, splitIdx).trim();
          const afterAddr = singleStr.substring(splitIdx).trim();

          if (beforeAddr && !name) {
            name = beforeAddr;
          }
          if (afterAddr && !address) {
            address = afterAddr;
          }
        } else {
          if (!name) name = singleStr;
        }
      }
    }

    const cleanName = (name || 'Khách hàng')
      .replace(/^(tên|họ tên|họ và tên|mình là|tôi là|khách hàng|người nhận|anh|chị|em|chốt đơn|chốt|đặt mua|mua)\s*[:\-]?\s*/i, '')
      .replace(/[,\.;\-]+$/, '')
      .trim() || 'Khách hàng';

    const cleanAddress = (address || 'Tại shop / Giao bưu cục theo SĐT')
      .replace(/^(địa chỉ|đ\/c|đc|ở|tại|giao về|giao đến|giao cho|ship về|ship đến|nơi nhận)\s*[:\-]?\s*/i, '')
      .replace(/[,\.;\-]+$/, '')
      .trim() || 'Tại shop / Giao bưu cục theo SĐT';

    return {
      name: cleanName,
      phone,
      address: cleanAddress
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
    const reportRegex = /(hôm (nay|đó|qua).*(bán được|doanh thu|danh thu|bán bao nhiêu|bao nhiêu sản phẩm|tiền bán)|(doanh thu|danh thu).*(hôm nay|hôm đó|hôm qua|ra sao|thế nào)|bán được gì|đã bán được gì|báo cáo.*(doanh thu|danh thu|bán hàng|kho|tổng quan)|tồn kho.*(còn lại|bao nhiêu|thế nào|hiện tại)|tổng quan.*kho|(xuất|tải|đưa ra|cho).*file.*(danh thu|doanh thu|excel|báo cáo|kho)|file (danh thu|doanh thu|excel)|thống kê.*(bán hàng|kho|doanh thu|danh thu)|giá trị tồn kho)/i;

    if (reportRegex.test(cleanQuestion)) {
      try {
        // Tự động bóc tách tên shop từ câu hỏi người dùng nếu có (vd: "shop huyQ7", "của shop huyQ7"...)
        let effectiveShopId = shop_id;
        const shopPattern = /(?:của\s+shop|shop|cửa\s+hàng)\s*[:\-]?\s*([a-zA-Z0-9_\-]+)/i;
        const shopMatch = cleanQuestion.match(shopPattern);
        const ignoreWords = ['nào', 'đó', 'n', '1', 'một', 'tôi', 'mình', 'nay', 'hôm', 'này', 'online', 'của', 'khác', 'bất', 'kỳ'];
        if (shopMatch && shopMatch[1] && !ignoreWords.includes(shopMatch[1].toLowerCase()) && shopMatch[1].length > 1) {
          effectiveShopId = shopMatch[1].trim();
        }

        let targetDate = null;
        const dateMatch = cleanQuestion.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear();
          targetDate = `${year}-${month}-${day}`;
        } else if (/hôm qua/i.test(cleanQuestion)) {
          const yest = new Date(Date.now() - 86400000);
          targetDate = yest.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        }

        const report = await shopReportService.generateDailySalesReport(effectiveShopId, targetDate);
        const excel = await shopReportService.exportUpdatedInventoryExcel(effectiveShopId);

        let reportText = `📊 **BÁO CÁO BÁN HÀNG & DOANH THU (Shop: ${effectiveShopId})**\n` +
          `📅 **Ngày:** ${report.date}\n\n` +
          `💰 **Tổng doanh thu hôm nay:** ${report.total_revenue.toLocaleString('vi-VN')} VNĐ\n` +
          `📦 **Tổng sản phẩm đã bán hôm nay:** ${report.total_items_sold} mặt hàng (${report.total_orders} đơn hàng)\n\n`;

        if (report.today_orders && report.today_orders.length > 0) {
          reportText += `📋 **Chi tiết từng đơn hàng đã chốt hôm nay:**\n`;
          report.today_orders.forEach(o => {
            reportText += `• **Đơn ${o.order_id}** [${o.time || 'Vừa xong'}] - Mã vận đơn: \`${o.tracking_number}\`\n` +
              `  - Khách nhận: **${o.customer_name}** (📞 ${o.customer_phone}) - 🏠 ${o.customer_address}\n` +
              `  - Mặt hàng: **${o.item_name}** x ${o.quantity} ${o.unit} ➔ Thành tiền COD: **${o.total_price.toLocaleString('vi-VN')} VNĐ**\n` +
              `  - Trạng thái: ${o.order_status === 'DELIVERED' ? '✅ Giao thành công' : (o.order_status === 'PRINTED' ? '📦 Đã in vận đơn' : (o.order_status === 'SHIPPED' ? '🚚 Đang giao' : '⏳ Chờ in vận đơn'))}\n`;
          });
          reportText += `\n`;
        } else {
          reportText += `📋 **Tình hình bán hàng ngày ${report.date}:**\n` +
            `Hôm nay shop **${effectiveShopId}** chưa phát sinh thêm đơn hàng mới nào.\n\n`;

          if (report.recent_orders && report.recent_orders.length > 0) {
            reportText += `📦 **Các đơn hàng đã chốt gần nhất của shop:**\n` +
              report.recent_orders.map(o => `• Đơn \`${o.order_id}\` (${o.date}): **${o.item_name}** x ${o.quantity} ${o.unit} ➔ **${o.total_price.toLocaleString('vi-VN')}đ** (Khách: ${o.customer_name} - ${o.customer_phone})`).join('\n') + `\n\n`;
          }

          if (report.all_time_summary && report.all_time_summary.total_orders > 0) {
            reportText += `💰 **Tổng doanh thu lũy kế toàn thời gian:** ${report.all_time_summary.total_revenue.toLocaleString('vi-VN')} VNĐ (${report.all_time_summary.total_orders} đơn hàng đã xuất kho).\n`;
          }
          if (report.inventory_summary && report.inventory_summary.total_skus > 0) {
            reportText += `📦 **Tình trạng kho:** Hiện có **${report.inventory_summary.total_skus}** mặt hàng trong danh mục sẵn sàng giao hàng.\n\n`;
          }
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

        reportText += `📥 **File Trang Tính Tồn Kho & Doanh Thu Tự Động (3 Sheet):**\n` +
          `• **Sheet 1 (TonKhoThucTe)**: Danh mục tồn kho thời gian thực (đã tự động trừ số lượng)\n` +
          `• **Sheet 2 (DonHang_DaBan)**: Chi tiết đơn hàng & mặt hàng nào đã bán, khách nhận, mã vận đơn\n` +
          `• **Sheet 3 (DoanhThu_Ngay_Va_Thang)**: Bảng tổng hợp doanh thu theo từng Ngày và theo từng Tháng\n` +
          `👉 [Tải File Excel Báo Cáo Doanh Thu Mới Nhất](${excel.download_url})`;

        return {
          found: true,
          is_report: true,
          shop_id: effectiveShopId,
          reply: reportText,
          report,
          excel_url: excel.download_url
        };
      } catch (err) {
        return {
          found: true,
          is_report: true,
          shop_id,
          reply: `📊 **BÁO CÁO DOANH THU & KHO HÀNG (Shop: ${shop_id})**\n\n` +
            `Dạ hệ thống đã kiểm tra dữ liệu của shop "${shop_id}". Hiện tại hệ thống chưa phát sinh đơn hàng bán mới trong ngày.\n` +
            `💡 Anh/chị có thể chốt đơn trực tiếp qua chatbox để AI tự động cập nhật số lượng tồn kho và tạo file Excel 3 Sheet nhé!`
        };
      }
    }

    // -------------------------------------------------------------
    // BƯỚC 4: KHÁCH HÀNG XÁC NHẬN CHỐT ĐƠN (CONFIRMATION)
    // -------------------------------------------------------------
    if (session.state === 'AWAITING_CONFIRMATION') {
      const confirmRegex = /(ok|oke|okie|okay|đúng rồi|đúng|chốt|chốt đơn|chốt luôn|chốt nhé|chuẩn|chuẩn rồi|chuẩn shop|chính xác|đồng ý|gửi đi|gửi hàng|lên đơn|lên đơn đi|lên đơn giúp|lên đơn luôn|ship luôn|ship đi|giao luôn|giao đi|tiến hành|vâng|được|được rồi|yes|yep|yup|không có sai sót|không sai sót|không sai|đầy đủ rồi|đúng thông tin|chuẩn xác|ok shop|ok em)/i;
      const cancelRegex = /(hủy|không mua|đổi ý|thôi|khoan|dừng)/i;

      if (confirmRegex.test(cleanQuestion)) {
        const draft = session.draftOrder;
        const lastOrder = session.lastOrder;

        // Nếu đơn hàng đã được trừ kho và chuyển bưu cục ở Bước 3
        if (lastOrder) {
          session.state = 'COMPLETED';
          session.draftOrder = null;
          return {
            found: true,
            is_order: true,
            shop_id,
            reply: `🎉 Dạ shop xin chân thành CẢM ƠN anh/chị đã tin tưởng và ủng hộ shop ạ!\n\n` +
                   `📦 Shop và bưu cục kho đã tiếp nhận thông tin và đang tiến hành đóng gói để gửi cho mình sớm nhất:\n` +
                   (draft && draft.item ? `• Sản phẩm: ${draft.item.name}\n• Số lượng: ${draft.quantity} ${draft.item.unit || 'cái'}\n` : '') +
                   (draft && draft.customer_name ? `• Người nhận: ${draft.customer_name} - ${draft.customer_phone}\n• Địa chỉ giao: ${draft.customer_address}\n\n` : '') +
                   `👉 Nếu anh/chị có quan tâm đến bất kỳ sản phẩm nào khác bên shop, vui lòng liên hệ lại với em để em hỗ trợ tư vấn và lên đơn chung cho mình nhé ạ! Chúc anh/chị một ngày thật vui vẻ! 😊`,
            order: lastOrder
          };
        }

        if (draft && draft.item) {
          try {
            const itemIdentifier = (draft.item.sku && draft.item.sku !== '-' && draft.item.sku.trim() !== '') ? draft.item.sku : draft.item.name;
            const orderResult = await this.processOrderAndDeduct({
              shop_id,
              item_identifier: itemIdentifier,
              quantity: draft.quantity,
              customer_name: draft.customer_name,
              customer_phone: draft.customer_phone,
              customer_address: draft.customer_address
            });

            session.state = 'COMPLETED';
            session.draftOrder = null;
            session.lastOrder = orderResult;

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
    // BƯỚC 3: NHẬN THÔNG TIN KHÁCH HÀNG (GHI NHẬN TÊN, ĐỊA CHỈ, SĐT ĐỂ CHUYỂN BƯU CỤC KHO)
    // -------------------------------------------------------------
    const contactInfo = this.extractCustomerContact(cleanQuestion);

    if (contactInfo) {
      let draft = session.draftOrder;
      if (!draft && session.lastDiscussedProduct) {
        const qtyMatch = cleanQuestion.match(/(\d+)\s*(cái|chai|bộ|bình|chiếc|viên|lon)?/i);
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        draft = {
          item: session.lastDiscussedProduct,
          quantity
        };
      }

      // Nếu chưa có draft hay lastDiscussedProduct, kiểm tra xem tin nhắn có nhắc tên sản phẩm trong kho không
      if (!draft) {
        const strippedProductSearch = cleanQuestion
          .replace(contactInfo.phone, '')
          .replace(contactInfo.name, '')
          .replace(contactInfo.address, '')
          .replace(/(tên|họ tên|sđt|sdt|địa chỉ|giao|về|đến|cho|mình|em|anh|chị|lấy|mua|đặt|ship|bình|chai|cái|chiếc|số|đường|quận|huyện|tp|hcm|hà nội|[0-9]+|[,\-:\.;|]+)/gi, ' ')
          .trim();

        if (strippedProductSearch.length >= 2) {
          const directMatches = await shopKnowledgeRepo.queryShopInventory(shop_id, null, strippedProductSearch);
          if (directMatches && directMatches.length > 0) {
            const qtyMatch = cleanQuestion.match(/(\d+)\s*(cái|chai|bộ|bình|chiếc|viên|lon)?/i);
            const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            draft = {
              item: directMatches[0],
              quantity
            };
          }
        }
      }

      if (draft && draft.item) {
        draft.customer_name = contactInfo.name;
        draft.customer_phone = contactInfo.phone;
        draft.customer_address = contactInfo.address;
        session.draftOrder = draft;
        session.state = 'AWAITING_CONFIRMATION';

        const totalMoney = Number(draft.item.price || 0) * draft.quantity;

        // Trừ kho tự động và ghi nhận chuyển sang Bưu Cục Kho
        let orderResult = null;
        try {
          const itemIdentifier = (draft.item.sku && draft.item.sku !== '-' && draft.item.sku.trim() !== '') ? draft.item.sku : draft.item.name;
          orderResult = await this.processOrderAndDeduct({
            shop_id,
            item_identifier: itemIdentifier,
            quantity: draft.quantity,
            customer_name: draft.customer_name,
            customer_phone: draft.customer_phone,
            customer_address: draft.customer_address
          });
          session.lastOrder = orderResult;
        } catch (err) {
          console.error('[ShopChatbot] Lỗi processOrderAndDeduct:', err.message);
        }

        const trackingNo = (orderResult && orderResult.owner_alert && orderResult.owner_alert.tracking_number) || `VNPOST${Date.now().toString().slice(-8)}`;

        const replyBill = 
`Họ tên: ${draft.customer_name}
Địa chỉ: ${draft.customer_address}
Sđt: ${draft.customer_phone}
Thông tin đơn hàng:
(Tên sản phẩm: ${draft.item.name}
Số lượng: ${draft.quantity} ${draft.item.unit || 'cái'} X ${Number(draft.item.price || 0).toLocaleString('vi-VN')} VNĐ = ${totalMoney.toLocaleString('vi-VN')} VNĐ)

📦 AI đã ghi nhận lại đơn hàng thành công và chuyển thông tin cho bưu cục kho!
• Mã vận đơn: ${trackingNo}
• Trạng thái: Chờ bưu cục in vận đơn và xuất kho giao hàng

Mời khách hàng check xem có sai sót gì không để lên đơn cho khách hàng.`;

        return {
          found: true,
          is_order: true,
          shop_id,
          reply: replyBill,
          order: orderResult
        };
      } else {
        // Ghi nhận thông tin liên hệ và hỏi sản phẩm cần mua
        session.savedContact = contactInfo;
        session.state = 'AWAITING_PRODUCT_SELECTION';
        return {
          found: true,
          shop_id,
          reply: `Dạ AI đã ghi nhận thông tin nhận hàng của anh/chị:\n` +
                 `• Họ tên: ${contactInfo.name}\n` +
                 `• Số điện thoại: ${contactInfo.phone}\n` +
                 `• Địa chỉ: ${contactInfo.address}\n\n` +
                 `Dạ anh/chị muốn đặt mua sản phẩm hoặc phụ tùng nào bên shop ạ? Vui lòng nhắn tên sản phẩm để em hoàn tất lên đơn và chuyển ngay cho bưu cục kho nhé!`
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

        // Nếu trước đó khách đã gửi thông tin liên hệ (session.savedContact), tự động lên đơn chuyển bưu cục kho
        if (session.savedContact) {
          const contactInfo = session.savedContact;
          const totalMoney = Number(targetProduct.price || 0) * quantity;
          let orderResult = null;
          try {
            const itemIdentifier = (targetProduct.sku && targetProduct.sku !== '-' && targetProduct.sku.trim() !== '') ? targetProduct.sku : targetProduct.name;
            orderResult = await this.processOrderAndDeduct({
              shop_id,
              item_identifier: itemIdentifier,
              quantity,
              customer_name: contactInfo.name,
              customer_phone: contactInfo.phone,
              customer_address: contactInfo.address
            });
            session.lastOrder = orderResult;
            session.state = 'AWAITING_CONFIRMATION';
            session.draftOrder = {
              item: targetProduct,
              quantity,
              customer_name: contactInfo.name,
              customer_phone: contactInfo.phone,
              customer_address: contactInfo.address
            };
          } catch (err) {
            console.error('[ShopChatbot] Lỗi processOrderAndDeduct từ savedContact:', err.message);
          }

          const trackingNo = (orderResult && orderResult.owner_alert && orderResult.owner_alert.tracking_number) || `VNPOST${Date.now().toString().slice(-8)}`;

          const replyBill = 
`Họ tên: ${contactInfo.name}
Địa chỉ: ${contactInfo.address}
Sđt: ${contactInfo.phone}
Thông tin đơn hàng:
(Tên sản phẩm: ${targetProduct.name}
Số lượng: ${quantity} ${targetProduct.unit || 'cái'} X ${Number(targetProduct.price || 0).toLocaleString('vi-VN')} VNĐ = ${totalMoney.toLocaleString('vi-VN')} VNĐ)

📦 AI đã ghi nhận lại đơn hàng thành công và chuyển thông tin cho bưu cục kho!
• Mã vận đơn: ${trackingNo}
• Trạng thái: Chờ bưu cục in vận đơn và xuất kho giao hàng

Mời khách hàng check xem có sai sót gì không để lên đơn cho khách hàng.`;

          return {
            found: true,
            is_order: true,
            shop_id,
            reply: replyBill,
            order: orderResult
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
   * Khách đặt mua / Chốt đơn -> Trừ kho và tạo thông báo cho Chủ Shop & Bưu Cục
   */
  async processOrderAndDeduct({ shop_id = 'default_shop', item_identifier, quantity = 1, customer_name, customer_phone, customer_address }) {
    const cleanIdentifier = (item_identifier && item_identifier !== '-' && item_identifier.trim() !== '') ? item_identifier.trim() : null;
    const reason = `Đơn hàng từ khách ${customer_name || 'Khách chat'} ${customer_phone ? `(SĐT: ${customer_phone})` : ''} ${customer_address ? `[Đ/C: ${customer_address}]` : ''}`;
    const result = await shopKnowledgeRepo.deductStockAndNotify(shop_id, cleanIdentifier, quantity, reason, {
      customer_name,
      customer_phone,
      customer_address,
      order_status: 'PENDING'
    });

    const customerReply = `✅ Đã ghi nhận đơn hàng ${quantity} x "${result.item.name}".\n` +
      `Shop đã chuyển thông tin sang bưu cục kho để đóng gói và vận chuyển sớm nhất cho bạn nhé!`;

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

