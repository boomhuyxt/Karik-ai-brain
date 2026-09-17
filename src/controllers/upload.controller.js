const path = require('path');
const fs = require('fs');
const { uploadsPath } = require('../storage');

class UploadController {
  async uploadFile(req, res, next) {
    try {
      const { fileName, fileType, fileSize, base64Data } = req.body;

      if (!base64Data || !fileName) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp dữ liệu file (fileName & base64Data).'
        });
      }

      // 1. Kiểm tra dung lượng file (Tối đa 50MB)
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      const actualSize = fileSize || Math.round((base64Data.length * 3) / 4);

      if (actualSize > MAX_SIZE) {
        return res.status(400).json({
          success: false,
          error: `File "${fileName}" vượt quá dung lượng tối đa cho phép là 50MB.`
        });
      }

      // 2. Kiểm tra định dạng file hợp lệ
      const ext = path.extname(fileName).toLowerCase();
      const allowedImageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
      const allowedVideoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
      const allowedDocExts = ['.doc', '.docx', '.pdf'];
      const allowedExcelExts = ['.xlsx', '.xls', '.csv'];

      let fileCategory = 'other';
      if (allowedImageExts.includes(ext) || (fileType && fileType.startsWith('image/'))) {
        fileCategory = 'image';
      } else if (allowedVideoExts.includes(ext) || (fileType && fileType.startsWith('video/'))) {
        fileCategory = 'video';
      } else if (allowedExcelExts.includes(ext) || (fileType && (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')))) {
        fileCategory = 'excel';
      } else if (ext === '.pdf') {
        fileCategory = 'pdf';
      } else if (ext === '.doc' || ext === '.docx') {
        fileCategory = 'word';
      } else {
        return res.status(400).json({
          success: false,
          error: `Định dạng file ${ext} không được hỗ trợ. Chỉ hỗ trợ Bảng tính Excel (.xlsx, .xls, .csv), Ảnh, Video, PDF và Word (.doc, .docx).`
        });
      }

      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const timestamp = Date.now();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedName}`;

      let fileUrl = '';
      let excelIngestResult = null;

      // 3. Nếu là file Excel kho hàng, upload trực tiếp lên Supabase Storage (Bucket 'kho') & Vector DB
      if (fileCategory === 'excel') {
        try {
          const chatFileHandlerService = require('../services/ai/chatFileHandler.service');
          const shopId = req.headers['x-shop-id'] || req.headers['x-user-email'] || req.user?.email || 'default_shop';
          excelIngestResult = await chatFileHandlerService.handleChatFileUpload({
            shop_id: shopId,
            fileName,
            base64Data: cleanBase64,
            buffer
          });
          fileUrl = excelIngestResult?.file_url || '';
        } catch (excelErr) {
          console.warn('[UploadController] Ingest excel warning:', excelErr.message);
        }
      } else {
        // 4. Các loại file khác (Ảnh, Video, PDF, Word): Ưu tiên lưu Cloud Supabase Storage
        const { supabase } = require('../config/supabase');
        let uploadedToCloud = false;

        if (supabase) {
          try {
            const storagePath = `media/${uniqueFileName}`;
            let contentType = fileType || 'application/octet-stream';
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('kho')
              .upload(storagePath, buffer, { contentType, upsert: true });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage.from('kho').getPublicUrl(storagePath);
              fileUrl = urlData?.publicUrl || uploadData.path;
              uploadedToCloud = true;
            }
          } catch (cloudErr) {
            console.warn('[UploadController] Cloud upload fallback to local:', cloudErr.message);
          }
        }

        // Fallback local disk chỉ khi không có Supabase Cloud
        if (!uploadedToCloud) {
          const savePath = path.join(uploadsPath, uniqueFileName);
          fs.writeFileSync(savePath, buffer);
          fileUrl = `/uploads/${uniqueFileName}`;
        }
      }

      return res.json({
        success: true,
        message: fileCategory === 'excel' 
          ? `Tải lên file Excel thành công! Đã cập nhật ${excelIngestResult?.total_items || 0} mặt hàng vào kho.`
          : 'Tải file lên thành công!',
        file: {
          url: fileUrl,
          name: fileName,
          savedName: uniqueFileName,
          size: actualSize,
          type: fileType || 'application/octet-stream',
          category: fileCategory,
          excelInfo: excelIngestResult
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UploadController();
