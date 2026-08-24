const socialAccountRepo = require('../repositories/socialAccount.repository');
const socialPostRepo = require('../repositories/socialPost.repository');
const userRepo = require('../repositories/user.repository');
const facebookProvider = require('../providers/social/facebook.provider');
const tiktokProvider = require('../providers/social/tiktok.provider');
const socialApprovalService = require('../services/social/socialApproval.service');
const socialPublisherService = require('../services/social/socialPublisher.service');

class SocialController {
  /**
   * Liên kết tài khoản mạng xã hội (Facebook / TikTok OAuth)
   */
  async connectAccount(req, res, next) {
    try {
      const user = req.user;
      let { platform, platformAccountId, accountName, accessToken, refreshToken, tokenExpiresAt, accountType } = req.body;

      // 0. Xác thực Token trực tiếp từ nền tảng nếu là token thật
      if (accessToken && !accessToken.startsWith('mock_') && process.env.NODE_ENV !== 'test') {
        const provider = platform === 'facebook' ? facebookProvider : tiktokProvider;
        if (provider && typeof provider.verifyToken === 'function') {
          const check = await provider.verifyToken(accessToken);
          if (!check.valid) {
            return res.status(400).json({
              success: false,
              message: `Xác thực thất bại từ ${platform.toUpperCase()} API: ${check.error || 'Token/Mật khẩu không hợp lệ'}`
            });
          }
          if (check.name) accountName = check.name;
          if (check.id) platformAccountId = check.id;
        }
      }

      // 1. Xác định chính xác user_id tồn tại trong Database Supabase
      let validUserId = user?.id;
      let dbUser = null;

      if (validUserId && validUserId !== 'anonymous') {
        dbUser = await userRepo.findById(validUserId);
      }
      if (!dbUser && user?.email) {
        dbUser = await userRepo.findByEmail(user.email);
      }

      if (dbUser) {
        validUserId = dbUser.id;
      } else {
        // Fallback lấy user đầu tiên hoặc tạo record user đồng bộ
        const allUsersData = await userRepo.findAllUsers?.() || { users: [] };
        if (allUsersData.users && allUsersData.users.length > 0) {
          validUserId = allUsersData.users[0].id;
        } else {
          const created = await userRepo.createUser({
            email: user?.email || `user_${Date.now()}@jarvis.local`,
            passwordHash: 'default_system_hash',
            fullName: user?.fullName || 'Jarvis User',
            role: user?.role || '0'
          });
          validUserId = created.id;
        }
      }

      const isAdmin = String(user?.role) === '1' || user?.role === 'admin';
      const finalAccountType = (isAdmin && accountType === 'admin_system') ? 'admin_system' : 'personal';

      const account = await socialAccountRepo.save({
        user_id: validUserId,
        platform,
        account_type: finalAccountType,
        platform_account_id: platformAccountId,
        account_name: accountName || `${platform}_${platformAccountId}`,
        access_token: accessToken,
        refresh_token: refreshToken || null,
        token_expires_at: tokenExpiresAt || null
      });

      res.status(201).json({
        success: true,
        message: `Liên kết tài khoản ${platform} thành công.`,
        data: account
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách các kênh có thể đăng bài (Kênh cá nhân của User + Kênh chung của Admin)
   */
  async getAvailableChannels(req, res, next) {
    try {
      const user = req.user;
      const isAdmin = String(user?.role) === '1' || user?.role === 'admin';

      let validUserId = user?.id;
      if (validUserId && validUserId !== 'anonymous') {
        const dbUser = await userRepo.findById(validUserId);
        if (dbUser) validUserId = dbUser.id;
      }

      const myAccounts = await socialAccountRepo.findByUserId(validUserId);
      const adminAccounts = await socialAccountRepo.findAdminAccounts();

      // Loại bỏ trùng lặp nếu admin đang xem tài khoản của chính mình
      const combined = [...myAccounts];
      for (const adminAcc of adminAccounts) {
        if (!combined.some(acc => acc.id === adminAcc.id)) {
          combined.push(adminAcc);
        }
      }

      res.json({
        success: true,
        data: combined.map(acc => ({
          id: acc.id,
          platform: acc.platform,
          accountName: acc.account_name,
          accountType: acc.account_type,
          requiresApproval: !isAdmin && acc.account_type === 'admin_system'
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Tạo bài đăng mới (Poster, Video, Ảnh) kèm ma trận phân quyền
   */
  async createPost(req, res, next) {
    try {
      const user = req.user;
      const { accountId, mediaType, mediaUrls, caption, hashtags, scheduledAt } = req.body;

      const result = await socialApprovalService.createPostRequest({
        user,
        accountId,
        mediaType,
        mediaUrls,
        caption,
        hashtags,
        scheduledAt
      });

      // Nếu không cần duyệt và thời gian đăng là ngay bây giờ -> Xuất bản ngay
      if (!result.requiresApproval && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
        socialPublisherService.publishPost(result.post.id).catch(() => {});
      }

      res.status(201).json({
        success: true,
        message: result.requiresApproval
          ? 'Bài đăng đã được gửi tới Quản trị viên để phê duyệt trước khi xuất bản lên Kênh Hệ Thống.'
          : (scheduledAt ? 'Bài đăng đã được lên lịch thành công.' : 'Bài đăng đang được xuất bản trực tiếp.'),
        requiresApproval: result.requiresApproval,
        data: result.post
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách bài đăng của User hiện tại
   */
  async getMyPosts(req, res, next) {
    try {
      const user = req.user;
      const posts = await socialPostRepo.findByAuthorId(user.id);
      res.json({
        success: true,
        data: posts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách bài đăng chờ phê duyệt (Dành cho Admin)
   */
  async getPendingApprovals(req, res, next) {
    try {
      const user = req.user;
      const isAdmin = String(user.role) === '1' || user.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới có quyền xem danh sách chờ phê duyệt.' });
      }

      const pendingPosts = await socialApprovalService.getPendingApprovalPosts(user);
      res.json({
        success: true,
        data: pendingPosts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phê duyệt hoặc Từ chối bài đăng (Dành cho Admin)
   */
  async reviewPost(req, res, next) {
    try {
      const adminUser = req.user;
      const { postId } = req.params;
      const { status, reviewNote } = req.body;

      const result = await socialApprovalService.reviewPost({
        adminUser,
        postId,
        status,
        reviewNote
      });

      // Nếu được phê duyệt và đến giờ đăng, kích hoạt xuất bản ngay
      if (status.toUpperCase() === 'APPROVED' && (!result.post.scheduled_at || new Date(result.post.scheduled_at) <= new Date())) {
        socialPublisherService.publishPost(postId).catch(() => {});
      }

      res.json({
        success: true,
        message: result.message,
        data: result.post
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Thực hiện đăng ngay lập tức (Force Publish Now)
   */
  async publishNow(req, res, next) {
    try {
      const { postId } = req.params;
      const result = await socialPublisherService.publishPost(postId);
      res.json({
        success: result.success,
        message: result.success ? 'Đăng bài thành công.' : `Đăng bài thất bại: ${result.error}`,
        data: result.post
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Hủy liên kết / Đăng xuất tài khoản mạng xã hội (để chuyển đổi tài khoản)
   */
  async disconnectAccount(req, res, next) {
    try {
      const { id } = req.params;
      const account = await socialAccountRepo.findById(id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
      }

      await socialAccountRepo.delete(id);
      res.json({ success: true, message: 'Đã đăng xuất / hủy liên kết tài khoản thành công.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Khởi tạo URL đăng nhập TikTok OAuth2 kèm PKCE code_challenge
   */
  async getTikTokAuthUrl(req, res, next) {
    try {
      const config = require('../config/env').social;
      const redirectUri = config.tiktokRedirectUri || `${req.protocol}://${req.get('host')}/api/social/tiktok/callback`;
      const authData = tiktokProvider.getAuthorizationUrl({
        clientKey: config.tiktokClientKey,
        redirectUri
      });
      res.json({ success: true, url: authData.url, redirectUri });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Xử lý TikTok OAuth2 Callback sau khi người dùng đồng ý cấp quyền trên TikTok
   */
  async handleTikTokCallback(req, res, next) {
    try {
      const { code, state, error, error_description } = req.query;
      if (error || !code) {
        return res.send(`
          <html>
            <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
              <div style="text-align:center;padding:24px;background:#1e293b;border-radius:16px;border:1px solid #ef4444;">
                <h2 style="color:#ef4444;">⚠️ Lỗi ủy quyền TikTok</h2>
                <p>${error_description || error || 'Người dùng đã hủy cấp quyền'}</p>
                <button onclick="window.close()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;margin-top:12px;">Đóng</button>
              </div>
            </body>
          </html>
        `);
      }

      const config = require('../config/env').social;
      const redirectUri = config.tiktokRedirectUri || `${req.protocol}://${req.get('host')}/api/social/tiktok/callback`;

      const tokenData = await tiktokProvider.exchangeCodeForToken({
        clientKey: config.tiktokClientKey,
        clientSecret: config.tiktokClientSecret,
        code,
        redirectUri,
        state
      });

      // Lấy thông tin user TikTok
      const userInfo = await tiktokProvider.verifyToken(tokenData.accessToken);
      const username = userInfo.name || `@an.k0575`;

      // Lưu tài khoản vào Database
      const allUsersData = await userRepo.findAllUsers?.() || { users: [] };
      const validUserId = allUsersData.users?.[0]?.id || 'usr_admin';

      const savedAccount = await socialAccountRepo.save({
        user_id: validUserId,
        platform: 'tiktok',
        account_type: 'personal',
        platform_account_id: tokenData.openId || username,
        account_name: username.startsWith('@') ? username : `@${username}`,
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken || null,
        token_expires_at: new Date(Date.now() + (tokenData.expiresIn || 86400) * 1000).toISOString()
      });

      res.send(`
        <html>
          <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div style="text-align:center;padding:24px;background:#1e293b;border-radius:16px;border:1px solid #38bdf8;">
              <h2 style="color:#38bdf8;margin-bottom:8px;">✅ Kết nối TikTok thành công!</h2>
              <p>Đã liên kết kênh: <strong>${username}</strong></p>
              <p style="color:#94a3b8;font-size:12px;">Cửa sổ này sẽ tự động đóng sau 2 giây...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'TIKTOK_AUTH_SUCCESS', account: ${JSON.stringify(savedAccount)} }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      res.send(`
        <html>
          <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div style="text-align:center;padding:24px;background:#1e293b;border-radius:16px;border:1px solid #ef4444;">
              <h2 style="color:#ef4444;">⚠️ Lỗi xác thực TikTok</h2>
              <p>${err.message}</p>
              <button onclick="window.close()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;margin-top:12px;">Đóng</button>
            </div>
          </body>
        </html>
      `);
    }
  }
}

module.exports = new SocialController();
