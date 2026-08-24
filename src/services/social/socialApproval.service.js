const socialAccountRepo = require('../../repositories/socialAccount.repository');
const socialPostRepo = require('../../repositories/socialPost.repository');

class SocialApprovalService {
  /**
   * Tạo yêu cầu đăng bài với ma trận phân quyền:
   * - User đăng tài khoản cá nhân: Tự động lên lịch (SCHEDULED), KHÔNG cần duyệt.
   * - User đăng tài khoản Admin: Cần Admin duyệt (PENDING_APPROVAL).
   * - Admin đăng bất kỳ tài khoản nào: Trực tiếp lên lịch (SCHEDULED), KHÔNG cần duyệt.
   */
  async createPostRequest({ user, accountId, mediaType, mediaUrls, caption, hashtags = [], scheduledAt }) {
    const account = await socialAccountRepo.findById(accountId);
    if (!account) {
      const error = new Error('Tài khoản mạng xã hội không tồn tại hoặc chưa được liên kết.');
      error.status = 404;
      throw error;
    }

    const isAdmin = String(user.role) === '1' || user.role === 'admin';
    const isOwner = account.user_id === user.id;
    const isAdminAccount = account.account_type === 'admin_system';

    // 1. Phân quyền và xác định trạng thái ban đầu
    let initialStatus = 'SCHEDULED';
    let requiresApproval = false;

    if (isAdmin) {
      // Admin đăng lên tài khoản bất kỳ -> Không cần duyệt
      initialStatus = 'SCHEDULED';
    } else {
      // User thường
      if (isAdminAccount) {
        // User đăng lên kênh Admin/Hệ thống -> BẮT BUỘC duyệt
        initialStatus = 'PENDING_APPROVAL';
        requiresApproval = true;
      } else if (isOwner) {
        // User đăng lên kênh cá nhân của chính mình -> Không cần duyệt
        initialStatus = 'SCHEDULED';
      } else {
        // User cố tình đăng lên kênh cá nhân của người khác -> Cấm
        const error = new Error('Bạn không có quyền đăng bài lên tài khoản của người dùng khác.');
        error.status = 403;
        throw error;
      }
    }

    const postRecord = {
      author_id: (user && user.id && user.id !== 'anonymous') ? user.id : account.user_id,
      account_id: account.id,
      platform: account.platform,
      media_type: mediaType,
      media_urls: mediaUrls,
      caption: caption || '',
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      status: initialStatus,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      retry_count: 0,
      max_retries: 3
    };

    const createdPost = await socialPostRepo.save(postRecord);

    return {
      post: createdPost,
      requiresApproval,
      message: requiresApproval
        ? 'Bài đăng đã được gửi đến hàng chờ duyệt của Admin (PENDING_APPROVAL).'
        : 'Bài đăng đã được xếp vào lịch đăng bài tự động (SCHEDULED).'
    };
  }

  /**
   * Admin duyệt hoặc từ chối bài đăng
   */
  async reviewPost({ adminUser, postId, status, reviewNote = '' }) {
    const isAdmin = String(adminUser.role) === '1' || adminUser.role === 'admin';
    if (!isAdmin) {
      const error = new Error('Chỉ Quản trị viên (Admin) mới có quyền duyệt bài.');
      error.status = 403;
      throw error;
    }

    const post = await socialPostRepo.findById(postId);
    if (!post) {
      const error = new Error('Bài đăng không tồn tại.');
      error.status = 404;
      throw error;
    }

    if (post.status !== 'PENDING_APPROVAL') {
      const error = new Error(`Bài đăng đang ở trạng thái "${post.status}", không thể phê duyệt lại.`);
      error.status = 400;
      throw error;
    }

    const nextStatus = status.toUpperCase() === 'APPROVED' ? 'SCHEDULED' : 'REJECTED';

    const updatedPost = await socialPostRepo.updateStatus(postId, nextStatus, {
      reviewed_by: adminUser.id,
      review_note: reviewNote || (nextStatus === 'APPROVED' ? 'Đã được phê duyệt bởi Admin' : 'Bị từ chối bởi Admin')
    });

    return {
      post: updatedPost,
      message: nextStatus === 'SCHEDULED'
        ? 'Đã duyệt bài đăng thành công. Bài viết được xếp vào lịch đăng bài.'
        : 'Đã từ chối bài đăng.'
    };
  }

  /**
   * Lấy danh sách bài chờ duyệt cho Admin
   */
  async getPendingApprovals(adminUser) {
    const isAdmin = String(adminUser.role) === '1' || adminUser.role === 'admin';
    if (!isAdmin) {
      const error = new Error('Chỉ Admin mới có quyền xem danh sách chờ duyệt.');
      error.status = 403;
      throw error;
    }
    return await socialPostRepo.findPendingApprovals();
  }
}

module.exports = new SocialApprovalService();
