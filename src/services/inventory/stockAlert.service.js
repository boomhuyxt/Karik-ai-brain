const inventoryRepo = require('../../repositories/inventory.repository');

class StockAlertService {
  /**
   * Trừ kho khi bán hàng hoặc điều chỉnh kho
   * @param {string} idOrSku - ID hoặc SKU của mặt hàng
   * @param {number} quantityChange - Số lượng thay đổi (dương là bán đi, âm là hoàn/nhập)
   * @param {string} reason - Lý do (VD: 'Khách mua tại quầy', 'Đơn online')
   */
  async updateStock(idOrSku, quantityChange, reason = 'Bán hàng') {
    const item = await inventoryRepo.findByIdOrSku(idOrSku);
    if (!item) {
      throw new Error(`Không tìm thấy sản phẩm có mã/ID "${idOrSku}".`);
    }

    const currentQty = Number(item.quantity || 0);
    const newQty = Math.max(0, currentQty - Number(quantityChange));
    const minThreshold = Number(item.min_threshold || 3);

    let status = 'in_stock';
    if (newQty <= 0) {
      status = 'out_of_stock';
    } else if (newQty <= minThreshold) {
      status = 'low_stock';
    }

    // Cập nhật Database
    const updatedItem = await inventoryRepo.upsert({
      ...item,
      quantity: newQty,
      status: status
    });

    // Tạo thông báo cảnh báo cho Chủ Shop
    let alertLevel = 'INFO';
    let alertMessage = `📦 [Cập nhật kho] Sản phẩm "${item.name}" vừa xuất bán ${quantityChange} ${item.unit}. Tồn kho hiện tại: ${newQty} ${item.unit}.`;

    if (newQty <= 0) {
      alertLevel = 'CRITICAL';
      alertMessage = `🚨 [HẾT HÀNG] Sản phẩm "${item.name}" (${item.sku}) ĐÃ HẾT HÀNG TRONG KHO (0 ${item.unit})! Chủ shop cần nhập thêm ngay lập tức.`;
    } else if (newQty <= minThreshold) {
      alertLevel = 'WARNING';
      alertMessage = `⚠️ [CẢNH BÁO TỒN THẤP] Sản phẩm "${item.name}" (${item.sku}) chỉ còn ${newQty} ${item.unit} (dưới mức tối thiểu ${minThreshold} ${item.unit}). Chủ shop hãy cân nhắc đặt hàng mới.`;
    }

    const alertRecord = await inventoryRepo.saveAlert({
      item_id: item.id,
      sku: item.sku,
      product_name: item.name,
      quantity_sold: quantityChange,
      previous_quantity: currentQty,
      remaining_quantity: newQty,
      level: alertLevel,
      message: alertMessage,
      reason: reason
    });

    return {
      success: true,
      item: updatedItem,
      alert: alertRecord
    };
  }

  async getRecentAlerts(limit = 20) {
    return await inventoryRepo.getAlerts(limit);
  }
}

module.exports = new StockAlertService();
