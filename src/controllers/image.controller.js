class ImageController {
  async generateImage(req, res, next) {
    try {
      return res.json({
        success: true,
        message: 'Tính năng tạo ảnh từ API ngoài đã được chuyển đổi sang AI Karik Studio (Gemini 3.6 Flash).'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ImageController();
