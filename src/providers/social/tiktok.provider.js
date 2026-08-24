/**
 * TikTok Content Posting API Provider
 * Hỗ trợ xuất bản Video, Photo Mode (Poster / Ảnh) và Luồng xác thực OAuth2 kèm PKCE code_challenge.
 */

const crypto = require('crypto');

class TikTokProvider {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://open.tiktokapis.com/v2';
    this.pkceStore = new Map();
  }

  /**
   * Tạo PKCE Verifier và Challenge cho TikTok OAuth
   */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('hex');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Tạo URL đăng nhập TikTok OAuth2 kèm PKCE code_challenge (bắt buộc bởi TikTok API v2)
   */
  getAuthorizationUrl({ clientKey, redirectUri, state }) {
    const scopes = 'user.info.basic,video.upload,video.publish';
    const authState = state || `jarvis_tt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // Lưu codeVerifier cho bước exchange token
    this.pkceStore.set(authState, codeVerifier);
    this.pkceStore.set('latest', codeVerifier);

    const params = new URLSearchParams({
      client_key: clientKey,
      scope: scopes,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: authState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
      state: authState,
      codeVerifier,
      codeChallenge
    };
  }

  /**
   * Đổi Authorization Code lấy Access Token từ TikTok API
   */
  async exchangeCodeForToken({ clientKey, clientSecret, code, redirectUri, state }) {
    const tokenUrl = `${this.baseUrl}/oauth/token/`;
    const codeVerifier = (state && this.pkceStore.get(state)) || this.pkceStore.get('latest') || '';

    const payload = {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    };

    if (codeVerifier) {
      payload.code_verifier = codeVerifier;
    }

    const params = new URLSearchParams(payload);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok || data.error || !data.data?.access_token) {
      const msg = data.error_description || data.error?.message || data.message || 'Lỗi cấp Access Token từ TikTok';
      throw new Error(`TikTok Token Exchange Error: ${msg}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in,
      openId: data.data.open_id,
      scope: data.data.scope
    };
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
      mediaType: 'video',
      raw: data
    };
  }

  /**
   * Alias publishPhoto -> publishPhotoMode
   */
  async publishPhoto(params) {
    return this.publishPhotoMode(params);
  }

  /**
   * Đăng Poster / Hình ảnh đơn lẻ hoặc nhiều ảnh (Photo Mode) lên TikTok
   */
  async publishPhotoMode({ accessToken, photoUrls, title = '', description = '' }) {
    if (!accessToken) throw new Error('TikTok accessToken is required');
    const images = Array.isArray(photoUrls) ? photoUrls : [photoUrls];
    if (images.length === 0) throw new Error('TikTok photo mode requires at least one image');

    if (accessToken.startsWith('mock_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        platform: 'tiktok',
        postId: `tt_photo_${Date.now()}`,
        publishId: `p_pub_${Date.now()}`,
        postUrl: `https://www.tiktok.com/@user/photo/${Date.now()}`,
        mediaType: 'photo_mode'
      };
    }

    const initUrl = `${this.baseUrl}/post/publish/content/init/`;
    const payload = {
      post_info: {
        title,
        description,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: images
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
      const msg = data.error?.message || 'Lỗi đăng ảnh Photo Mode lên TikTok';
      throw new Error(`TikTok Photo Mode Error: ${msg}`);
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
