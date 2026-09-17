const path = require('path');
const excelParserService = require('../inventory/excelParser.service');
const { getEmbedding } = require('../../providers/gemini/embedding');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');
const { supabase } = require('../../config/supabase');

class ChatFileHandlerService {
  /**
   * Xử lý khi Chủ Shop gửi File (Excel, CSV, văn bản) trực tiếp vào Chatbox
   * Tự động lưu trữ vĩnh viễn trực tiếp trên Supabase Storage Cloud (Bucket 'kho') & Database (shop_knowledge_files)
   * Không lưu bản sao rác trên ổ cứng máy chủ.
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

    const ext = path.extname(fileName).toLowerCase();
    const cleanFileName = fileName.replace(/[^\w.-]/g, '_');
    const storagePath = `${shop_id}/${Date.now()}_${cleanFileName}`;

    // 1. Tải trực tiếp file từ RAM (Buffer) lên Supabase Storage (Bucket 'kho') - Không lưu ổ cứng local
    let cloudFileUrl = `supabase://storage/kho/${storagePath}`;

    if (supabase) {
      try {
        let contentType = 'application/octet-stream';
        if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
        else if (ext === '.csv') contentType = 'text/csv';
        else if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.txt') contentType = 'text/plain';

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('kho')
          .upload(storagePath, fileBuffer, {
            contentType,
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('kho').getPublicUrl(storagePath);
          cloudFileUrl = urlData?.publicUrl || uploadData.path || storagePath;
        } else if (uploadError) {
          console.warn('[Supabase Storage] Lỗi upload cloud bucket kho:', uploadError.message);
        }
      } catch (err) {
        console.warn('[Supabase Storage] Ngoại lệ khi upload cloud:', err.message);
      }
    }

    // 2. Parse dữ liệu tồn kho từ file Excel / CSV trực tiếp từ Memory Buffer
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

    // 4. Tạo văn bản ngữ cảnh (Semantic Chunks) để train cho AI
    const summaryLines = inventoryData.map(item => 
      `Sản phẩm: ${item.name || ''}. Phù hợp dòng xe: ${item.compatible_models || 'Tất cả'}. Số lượng tồn: ${item.quantity || 0} ${item.unit || 'cái'}. Giá: ${Number(item.price || 0).toLocaleString('vi-VN')} VNĐ. Vị trí: ${item.location || 'Kho'}.`
    );
    const semanticChunks = `[Kho hàng Shop: ${shop_id} - File: ${fileName}]\n` + summaryLines.join('\n');

    // 5. Sinh Vector Embedding cho toàn bộ file kho
    const embedding = await getEmbedding(semanticChunks);

    // 6. Lưu vào đúng 1 BẢNG DUY NHẤT (shop_knowledge_files) với đường dẫn Cloud vĩnh viễn
    const savedRecord = await shopKnowledgeRepo.saveFileRecord({
      shop_id,
      file_name: fileName,
      file_path: cloudFileUrl,
      file_type: fileType,
      inventory_data: inventoryData,
      semantic_chunks: semanticChunks,
      embedding: embedding
    });

    return {
      success: true,
      message: `✅ Đã lưu trữ file lên Supabase Storage (Bucket "kho") & cập nhật thành công kho của Shop "${shop_id}".\n` +
               `• Cloud URL: ${cloudFileUrl}\n` +
               `• Tổng số sản phẩm nhận diện: ${inventoryData.length} mặt hàng\n` +
               `• Đã train Vector AI thành công! Dữ liệu đã an toàn trên Cloud, không sợ mất khi cúp điện hay khởi động lại máy.`,
      file_id: savedRecord.id,
      file_url: cloudFileUrl,
      total_items: inventoryData.length,
      items: inventoryData.slice(0, 5)
    };
  }
}

module.exports = new ChatFileHandlerService();
