/**
 * TikTok Content Posting API Provider
 * Hỗ trợ xuất bản Video và Photo Mode (Poster / Ảnh) lên TikTok.
 */

class TikTokProvider {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://open.tiktokapis.com/v2';
  }

  /**
   * Đăng Video lên TikTok qua Content Posting API
   */
  async publishVideo({ accessToken, videoUrl, title = '', privacyLevel = 'PUBLIC_TO_EVERYONE' }) {
    if (!accessToken) throw new Error('TikTok accessToken is required');

    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        platform: 'tiktok',
        postId: `tt_video_${Date.now()}`,
        publishId: `v_pub_${Date.now()}`,
        postUrl: `https://www.tiktok.com/@user/video/${Date.now()}`,
        mediaType: 'video'
      };
    }

    const initUrl = `${this.baseUrl}/post/publish/video/init/`;
    const payload = {
      post_info: {
        title,
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl
      }
    };

    const response = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.error?.code !== 'ok') {
      const msg = data.error?.message || 'Lỗi khởi tạo upload video lên TikTok';
      throw new Error(`TikTok Video Error: ${msg}`);
    }

    const publishId = data.data?.publish_id;
    return {
      success: true,
      platform: 'tiktok',
      publishId,
      postId: publishId,
      postUrl: `https://www.tiktok.com/@user/video/${publishId}`,
      raw: data
    };
  }

  /**
   * Đăng Ảnh / Poster (TikTok Photo Mode)
   */
  async publishPhoto({ accessToken, photoUrls = [], title = '', description = '', privacyLevel = 'PUBLIC_TO_EVERYONE' }) {
    if (!accessToken) throw new Error('TikTok accessToken is required');

    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        platform: 'tiktok',
        postId: `tt_photo_${Date.now()}`,
        publishId: `p_pub_${Date.now()}`,
        postUrl: `https://www.tiktok.com/@user/photo/${Date.now()}`,
        mediaType: 'image'
      };
    }

    const initUrl = `${this.baseUrl}/post/publish/content/init/`;
    const payload = {
      post_info: {
        title: title || description.slice(0, 50),
        description,
        privacy_level: privacyLevel
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: photoUrls
      },
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO'
    };

    const response = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.error?.code !== 'ok') {
      const msg = data.error?.message || 'Lỗi đăng ảnh/poster lên TikTok';
      throw new Error(`TikTok Photo Error: ${msg}`);
    }

    const publishId = data.data?.publish_id;
    return {
      success: true,
      platform: 'tiktok',
      postId: data.data?.post_id || publishId,
      publishId,
      postUrl: `https://www.tiktok.com/@user/photo/${publishId}`,
      mediaType: 'photo_mode',
      raw: data
    };
  }

  /**
   * Kiểm tra tính hợp lệ của TikTok Access Token
   */
  async verifyToken(accessToken) {
    if (!accessToken) return { valid: false, error: 'Token is required' };
    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return { valid: true, id: 'mock_tt_id', name: 'Mock TikTok User' };
    }
    try {
      const url = `${this.baseUrl}/user/info/`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok || data.error?.code !== 'ok') {
        return { valid: false, error: data.error?.message || 'Token TikTok không hợp lệ' };
      }
      return { valid: true, id: data.data?.user?.open_id, name: data.data?.user?.display_name || 'TikTok User' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

module.exports = new TikTokProvider();
