const socialPostRepo = require('../../repositories/socialPost.repository');
const socialAccountRepo = require('../../repositories/socialAccount.repository');
const facebookProvider = require('../../providers/social/facebook.provider');
const tiktokProvider = require('../../providers/social/tiktok.provider');

class SocialPublisherService {
  /**
   * Thực thi xuất bản một bài đăng cụ thể sang nền tảng tương ứng
   */
  async publishPost(postId) {
    const post = await socialPostRepo.findById(postId);
    if (!post) throw new Error(`Không tìm thấy bài đăng ${postId}`);

    let account = post.account;
    if (!account && post.account_id) {
      account = await socialAccountRepo.findById(post.account_id);
    }
    if (!account) throw new Error(`Không tìm thấy tài khoản liên kết cho bài đăng ${postId}`);

    // Đánh dấu đang xử lý
    await socialPostRepo.updateStatus(postId, 'PROCESSING');

    try {
      let publishResult = null;
      const fullCaption = this._buildCaptionWithHashtags(post.caption, post.hashtags);
      const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];

      if (post.platform === 'facebook') {
        if (post.media_type === 'video') {
          publishResult = await facebookProvider.publishVideo({
            accessToken: account.access_token,
            pageId: account.platform_account_id,
            videoUrl: mediaUrls[0],
            title: post.caption?.slice(0, 100) || '',
            description: fullCaption
          });
        } else if (post.media_type === 'carousel' || mediaUrls.length > 1) {
          publishResult = await facebookProvider.publishMultiPhotos({
            accessToken: account.access_token,
            pageId: account.platform_account_id,
            mediaUrls,
            caption: fullCaption
          });
        } else {
          // Single image or poster
          publishResult = await facebookProvider.publishPhoto({
            accessToken: account.access_token,
            pageId: account.platform_account_id,
            photoUrl: mediaUrls[0],
            caption: fullCaption
          });
        }
      } else if (post.platform === 'tiktok') {
        if (post.media_type === 'video') {
          publishResult = await tiktokProvider.publishVideo({
            accessToken: account.access_token,
            videoUrl: mediaUrls[0],
            title: fullCaption.slice(0, 150)
          });
        } else {
          // Photo mode / Poster
          publishResult = await tiktokProvider.publishPhoto({
            accessToken: account.access_token,
            photoUrls: mediaUrls,
            title: post.caption?.slice(0, 50) || 'Jarvis AI Post',
            description: fullCaption
          });
        }
      } else {
        throw new Error(`Nền tảng "${post.platform}" chưa được hỗ trợ`);
      }

      // Cập nhật thành công
      const updated = await socialPostRepo.updateStatus(postId, 'PUBLISHED', {
        published_at: new Date().toISOString(),
        post_external_id: publishResult.postId || publishResult.publishId,
        post_external_url: publishResult.postUrl,
        error_message: null
      });

      return {
        success: true,
        post: updated,
        publishResult
      };
    } catch (err) {
      const nextRetry = (post.retry_count || 0) + 1;
      const updated = await socialPostRepo.updateStatus(postId, 'FAILED', {
        retry_count: nextRetry,
        error_message: err.message
      });

      return {
        success: false,
        post: updated,
        error: err.message
      };
    }
  }

  /**
   * Quét và xử lý tất cả bài đăng đến hạn xuất bản
   */
  async processDuePosts() {
    const duePosts = await socialPostRepo.findDuePosts(new Date());
    const results = [];

    for (const post of duePosts) {
      try {
        const res = await this.publishPost(post.id);
        results.push(res);
      } catch (err) {
        results.push({ success: false, postId: post.id, error: err.message });
      }
    }

    return results;
  }

  /**
   * Tự động thử lại (Retry) các bài đăng bị lỗi còn hạn retry
   */
  async processRetries() {
    const retryablePosts = await socialPostRepo.findFailedRetryable(3);
    const results = [];

    for (const post of retryablePosts) {
      try {
        const res = await this.publishPost(post.id);
        results.push(res);
      } catch (err) {
        results.push({ success: false, postId: post.id, error: err.message });
      }
    }

    return results;
  }

  _buildCaptionWithHashtags(caption = '', hashtags = []) {
    let result = caption ? caption.trim() : '';
    if (Array.isArray(hashtags) && hashtags.length > 0) {
      const tagStr = hashtags.map(tag => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ');
      result = result ? `${result}\n\n${tagStr}` : tagStr;
    }
    return result;
  }
}

module.exports = new SocialPublisherService();
