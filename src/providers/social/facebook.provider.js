/**
 * Facebook Graph API Provider
 * Cung cấp các phương thức xuất bản bài viết, hình ảnh, poster, video lên Facebook Pages/Feed.
 */

class FacebookProvider {
  constructor(options = {}) {
    this.apiVersion = options.apiVersion || 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Đăng ảnh / poster đơn lẻ lên Facebook Page
   */
  async publishPhoto({ accessToken, pageId, photoUrl, caption = '' }) {
    if (!accessToken) throw new Error('Facebook accessToken is required');
    const target = pageId || 'me';

    // Mock Mode / Local testing fallback if token is a mock
    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        platform: 'facebook',
        postId: `fb_photo_${Date.now()}`,
        postUrl: `https://facebook.com/${target}/photos/${Date.now()}`,
        mediaType: 'image'
      };
    }

    const url = `${this.baseUrl}/${target}/photos`;
    const payload = {
      url: photoUrl,
      caption,
      access_token: accessToken
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errMessage = data.error ? data.error.message : 'Lỗi không xác định từ Facebook API';
      throw new Error(`Facebook API Error: ${errMessage}`);
    }

    return {
      success: true,
      platform: 'facebook',
      postId: data.id || data.post_id,
      postUrl: `https://facebook.com/${data.post_id || data.id}`,
      raw: data
    };
  }

  /**
   * Đăng Video lên Facebook Page / Reels
   */
  async publishVideo({ accessToken, pageId, videoUrl, title = '', description = '' }) {
    if (!accessToken) throw new Error('Facebook accessToken is required');
    const target = pageId || 'me';

    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        platform: 'facebook',
        postId: `fb_video_${Date.now()}`,
        postUrl: `https://facebook.com/${target}/videos/${Date.now()}`,
        mediaType: 'video'
      };
    }

    const url = `${this.baseUrl}/${target}/videos`;
    const payload = {
      file_url: videoUrl,
      title,
      description,
      access_token: accessToken
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errMessage = data.error ? data.error.message : 'Lỗi xuất bản video lên Facebook';
      throw new Error(`Facebook Video Error: ${errMessage}`);
    }

    return {
      success: true,
      platform: 'facebook',
      postId: data.id,
      postUrl: `https://facebook.com/${data.id}`,
      raw: data
    };
  }

  /**
   * Đăng nhiều ảnh (Carousel / Multi-image)
   */
  async publishMultiPhotos({ accessToken, pageId, mediaUrls = [], caption = '' }) {
    if (!accessToken) throw new Error('Facebook accessToken is required');
    const target = pageId || 'me';

    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        platform: 'facebook',
        postId: `fb_album_${Date.now()}`,
        postUrl: `https://facebook.com/${target}/posts/${Date.now()}`,
        mediaType: 'carousel'
      };
    }

    // 1. Upload unpublished photos first
    const attachedMedia = [];
    for (const url of mediaUrls) {
      const uploadUrl = `${this.baseUrl}/${target}/photos`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          published: false,
          access_token: accessToken
        })
      });
      const photoData = await res.json();
      if (photoData.id) {
        attachedMedia.push({ media_fbid: photoData.id });
      }
    }

    // 2. Publish feed post with attached media
    const feedUrl = `${this.baseUrl}/${target}/feed`;
    const feedPayload = {
      message: caption,
      attached_media: attachedMedia,
      access_token: accessToken
    };

    const feedRes = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedPayload)
    });

    const postData = await feedRes.json();
    if (!feedRes.ok || postData.error) {
      throw new Error(`Facebook Multi-photo Error: ${postData.error?.message || 'Failed to publish post'}`);
    }

    return {
      success: true,
      platform: 'facebook',
      postId: postData.id,
      postUrl: `https://facebook.com/${postData.id}`,
      raw: postData
    };
  }

  /**
   * Kiểm tra tính hợp lệ của Token trực tiếp từ Graph API
   */
  async verifyToken(accessToken) {
    if (!accessToken) return { valid: false, error: 'Token is required' };
    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return { valid: true, id: 'mock_fb_id', name: 'Mock FB Page/User' };
    }
    try {
      const url = `${this.baseUrl}/me?fields=id,name&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        return { valid: false, error: data.error?.message || 'Token Facebook không hợp lệ' };
      }
      return { valid: true, id: data.id, name: data.name };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

module.exports = new FacebookProvider();
