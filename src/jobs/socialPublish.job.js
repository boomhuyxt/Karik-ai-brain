const logger = require('../utils/logger');
const socialPublisherService = require('../services/social/socialPublisher.service');

class SocialPublishJob {
  async run() {
    try {
      logger.info('[Background Job] Quét hàng đợi xuất bản mạng xã hội (Facebook & TikTok)...');
      const publishResults = await socialPublisherService.processDuePosts();
      const retryResults = await socialPublisherService.processRetries();

      const totalProcessed = publishResults.length + retryResults.length;
      if (totalProcessed > 0) {
        logger.info(`[Background Job] Đã xử lý ${totalProcessed} bài đăng.`);
      }
    } catch (err) {
      logger.error(`[Background Job] Lỗi khi xử lý hàng đợi mạng xã hội: ${err.message}`);
    }
  }
}

module.exports = new SocialPublishJob();
