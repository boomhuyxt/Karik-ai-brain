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

      // Nếu không cần duyệt và không hẹn giờ (hoặc hẹn giờ trong quá khứ), có thể thử xuất bản ngay
      if (!result.requiresApproval && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
        // Xuất bản nền để phản hồi nhanh
        socialPublisherService.publishPost(result.post.id).catch(() => {});
      }

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.post,
        requiresApproval: result.requiresApproval
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách bài đăng của người dùng hiện tại
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
   * Admin: Lấy danh sách các bài đăng đang chờ phê duyệt (PENDING_APPROVAL)
   */
  async getPendingApprovals(req, res, next) {
    try {
      const adminUser = req.user;
      const pendingPosts = await socialApprovalService.getPendingApprovals(adminUser);
      res.json({
        success: true,
        data: pendingPosts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Phê duyệt hoặc từ chối bài đăng
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
      res.json({
        success: true,
        message: `Đã đăng xuất / hủy liên kết tài khoản ${account.platform} thành công.`
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SocialController();
