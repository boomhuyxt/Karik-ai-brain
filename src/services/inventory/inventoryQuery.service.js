const { getEmbedding } = require('../../providers/gemini/embedding');
const inventoryRepo = require('../../repositories/inventory.repository');

class InventoryQueryService {
  /**
   * Tra cứu tồn kho bằng ngôn ngữ tự nhiên (Hybrid RAG: Vector Semantic + Real-time Database)
   * @param {string} userQuery - Câu hỏi tự nhiên của khách (VD: "nhớt cho xe wave còn không?")
   */
  async queryStock(userQuery) {
    if (!userQuery || !userQuery.trim()) {
      return {
        found: false,
        message: 'Vui lòng cung cấp câu hỏi hoặc tên sản phẩm cần kiểm tra.'
      };
    }

    const cleanQuery = userQuery.trim();

    // 1. Sinh vector embedding từ câu hỏi của khách
    const queryVector = await getEmbedding(cleanQuery);

    // 2. Tìm kiếm các sản phẩm tương đồng qua Vector DB
    const vectorMatches = await inventoryRepo.searchSimilarVectors(queryVector, 5);

    // 3. Tìm kiếm bổ trợ bằng Text Search (Keyword matching)
    const textSearchResult = await inventoryRepo.findAll({ search: cleanQuery, limit: 5 });
    const textMatches = textSearchResult.data || [];

    // 4. Hợp nhất danh sách sản phẩm (Deduplicate theo ID)
    const combinedMap = new Map();

    for (const match of vectorMatches) {
      const item = match.item || await inventoryRepo.findByIdOrSku(match.item_id);
      if (item) {
        combinedMap.set(item.id, {
          ...item,
          similarity: match.similarity || 0.8
        });
      }
    }

    for (const item of textMatches) {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, {
          ...item,
          similarity: 0.85
        });
      }
    }

    const matchedProducts = Array.from(combinedMap.values());

    if (matchedProducts.length === 0) {
      return {
        found: false,
        query: cleanQuery,
        message: `Dạ hiện tại không tìm thấy sản phẩm nào trong kho phù hợp với yêu cầu "${cleanQuery}".`,
        products: []
      };
    }

    // 5. Tổng hợp thông tin tình trạng tồn kho thời gian thực
    const productsDetails = matchedProducts.map(p => {
      const qty = Number(p.quantity || 0);
      const isAvailable = qty > 0;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        compatible_models: p.compatible_models,
        quantity: qty,
        unit: p.unit || 'cái',
        price: Number(p.price || 0),
        formatted_price: `${Number(p.price || 0).toLocaleString('vi-VN')} VNĐ`,
        location: p.location || 'Kho chính',
        status: isAvailable ? (qty <= (p.min_threshold || 3) ? 'Sắp hết' : 'Còn hàng') : 'Hết hàng',
        is_available: isAvailable
      };
    });

    // 6. Xây dựng câu trả lời tự nhiên cho Khách hàng
    const availableItems = productsDetails.filter(p => p.is_available);
    let naturalReply = '';

    if (availableItems.length > 0) {
      const main = availableItems[0];
      naturalReply = `Dạ bên em CÒN HÀNG sản phẩm "${main.name}" (phù hợp cho ${main.compatible_models || 'dòng xe bạn hỏi'}).\n` +
        `• Số lượng tồn kho: ${main.quantity} ${main.unit}\n` +
        `• Giá bán: ${main.formatted_price}\n` +
        `• Vị trí lưu kho: ${main.location}`;

      if (availableItems.length > 1) {
        naturalReply += `\n\nNgoài ra bên em còn có thêm các lựa chọn tương thích khác:\n` +
          availableItems.slice(1).map(item => `- ${item.name} (${item.formatted_price}) - Còn ${item.quantity} ${item.unit}`).join('\n');
      }
    } else {
      const outItem = productsDetails[0];
      naturalReply = `Dạ sản phẩm "${outItem.name}" hiện ĐÃ TẠM HẾT HÀNG trong kho ạ. Bạn có thể để lại thông tin để khi hàng về shop sẽ thông báo ngay nhé!`;
    }

    return {
      found: true,
      query: cleanQuery,
      reply: naturalReply,
      total_found: productsDetails.length,
      products: productsDetails
    };
  }
}

module.exports = new InventoryQueryService();
