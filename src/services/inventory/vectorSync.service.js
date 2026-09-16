const { getEmbedding } = require('../../providers/gemini/embedding');
const inventoryRepo = require('../../repositories/inventory.repository');

class VectorSyncService {
  /**
   * Tạo văn bản ngữ cảnh mô tả sản phẩm (Semantic Rich Text)
   * Tối ưu cho AI Semantic Search khi khách hàng hỏi bằng ngôn ngữ tự nhiên
   */
  generateSemanticChunk(item) {
    const parts = [
      `Tên sản phẩm: ${item.name}.`,
      item.category ? `Danh mục: ${item.category}.` : '',
      item.compatible_models ? `Thích hợp và dùng cho các dòng xe: ${item.compatible_models}.` : '',
      `Mã sản phẩm SKU: ${item.sku}.`,
      item.price ? `Giá bán lẻ: ${Number(item.price).toLocaleString('vi-VN')} VNĐ.` : '',
      item.location ? `Vị trí lưu kho: ${item.location}.` : '',
      item.description ? `Mô tả công dụng và đặc điểm: ${item.description}.` : ''
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Đồng bộ Vector Embedding cho 1 sản phẩm
   */
  async syncItemVector(item) {
    if (!item || !item.id) return null;
    const chunkText = this.generateSemanticChunk(item);
    const embedding = await getEmbedding(chunkText);
    return await inventoryRepo.saveEmbedding(item.id, chunkText, embedding);
  }

  /**
   * Đồng bộ Vector Embedding hàng loạt cho danh sách sản phẩm (Batch Sync sau khi Import Excel)
   */
  async batchSyncVectors(items) {
    const results = [];
    for (const item of items) {
      try {
        const res = await this.syncItemVector(item);
        results.push({ id: item.id, sku: item.sku, success: true });
      } catch (err) {
        results.push({ id: item.id, sku: item.sku, success: false, error: err.message });
      }
    }
    return results;
  }
}

module.exports = new VectorSyncService();
