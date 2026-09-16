const path = require('path');
const fs = require('fs');
const { uploadsPath } = require('../../storage');
const excelParserService = require('../inventory/excelParser.service');
const { getEmbedding } = require('../../providers/gemini/embedding');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');

class ChatFileHandlerService {
  /**
   * Xử lý khi Chủ Shop gửi File (Excel, CSV, văn bản) trực tiếp vào Chatbox
   */
  async handleChatFileUpload({ shop_id = 'default_shop', fileName, base64Data, buffer }) {
    if (!fileName) {
      throw new Error('Vui lòng cung cấp tên file.');
    }

    let fileBuffer;
    if (base64Data) {
      const cleanBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (buffer) {
      fileBuffer = buffer;
    } else {
      throw new Error('Dữ liệu file không tồn tại.');
    }

    // 1. Lưu file vật lý vào thư mục uploads
    const uniqueFileName = `shop_${shop_id}_${Date.now()}_${fileName}`;
    const targetFilePath = path.join(uploadsPath, uniqueFileName);
    fs.writeFileSync(targetFilePath, fileBuffer);

    // 2. Parse dữ liệu tồn kho từ file Excel / CSV
    const ext = path.extname(fileName).toLowerCase();
    let inventoryData = [];
    let fileType = 'other';

    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      fileType = 'excel';
      inventoryData = excelParserService.parseExcel(fileBuffer);
    } else {
      fileType = 'text';
      const textContent = fileBuffer.toString('utf-8');
      inventoryData = [{
        name: fileName,
        description: textContent,
        quantity: 1,
        status: 'in_stock'
      }];
    }

    // 3. Tạo văn bản ngữ cảnh (Semantic Chunks) để train cho AI
    const summaryLines = inventoryData.map(item => 
      `Sản phẩm: ${item.name || ''}. Phù hợp dòng xe: ${item.compatible_models || 'Tất cả'}. Số lượng tồn: ${item.quantity || 0} ${item.unit || 'cái'}. Giá: ${Number(item.price || 0).toLocaleString('vi-VN')} VNĐ. Vị trí: ${item.location || 'Kho'}.`
    );
    const semanticChunks = `[Kho hàng Shop: ${shop_id} - File: ${fileName}]\n` + summaryLines.join('\n');

    // 4. Sinh Vector Embedding cho toàn bộ file kho
    const embedding = await getEmbedding(semanticChunks);

    // 5. Lưu vào đúng 1 BẢNG DUY NHẤT (shop_knowledge_files)
    const savedRecord = await shopKnowledgeRepo.saveFileRecord({
      shop_id,
      file_name: fileName,
      file_path: targetFilePath,
      file_type: fileType,
      inventory_data: inventoryData,
      semantic_chunks: semanticChunks,
      embedding: embedding
    });

    return {
      success: true,
      message: `✅ Đã nạp thành công file "${fileName}" vào kho của Shop "${shop_id}".\n` +
               `• Đã lưu đường dẫn: ${targetFilePath}\n` +
               `• Tổng số sản phẩm nhận diện: ${inventoryData.length} mặt hàng\n` +
               `• Đã train Vector AI thành công! Bây giờ Chatbot có thể tự động trả lời khách hàng.`,
      file_id: savedRecord.id,
      total_items: inventoryData.length,
      items: inventoryData.slice(0, 5) // Preview 5 items đầu tiên
    };
  }
}

module.exports = new ChatFileHandlerService();
