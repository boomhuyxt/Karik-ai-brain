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

      let fileCategory = 'other';
      if (allowedImageExts.includes(ext) || (fileType && fileType.startsWith('image/'))) {
        fileCategory = 'image';
      } else if (allowedVideoExts.includes(ext) || (fileType && fileType.startsWith('video/'))) {
        fileCategory = 'video';
      } else if (ext === '.pdf') {
        fileCategory = 'pdf';
      } else if (ext === '.doc' || ext === '.docx') {
        fileCategory = 'word';
      } else {
        return res.status(400).json({
          success: false,
          error: `Định dạng file ${ext} không được hỗ trợ. Chỉ hỗ trợ Ảnh (PNG, JPG, WEBP, GIF, SVG), Video (MP4, WEBM, MOV, AVI), PDF và Word (.doc, .docx).`
        });
      }

      // 3. Xử lý lưu file vào ổ đĩa local
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const timestamp = Date.now();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedName}`;
      const savePath = path.join(uploadsPath, uniqueFileName);

      fs.writeFileSync(savePath, buffer);

      const fileUrl = `/uploads/${uniqueFileName}`;

      return res.json({
        success: true,
        message: 'Tải file lên thành công!',
        file: {
          url: fileUrl,
          name: fileName,
          savedName: uniqueFileName,
          size: actualSize,
          type: fileType || 'application/octet-stream',
          category: fileCategory
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UploadController();
