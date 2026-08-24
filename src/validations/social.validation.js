/**
 * Social Validation Middleware
 * Validate payloads for connecting social accounts, creating posts, and admin reviews.
 */

const validateConnectAccount = (req, res, next) => {
  const { platform, platformAccountId, accessToken, accountType } = req.body;

  if (!platform || !['facebook', 'tiktok'].includes(platform.toLowerCase())) {
    return res.status(400).json({
      error: true,
      message: 'Platform không hợp lệ. Vui lòng chọn facebook hoặc tiktok.'
    });
  }

  if (!platformAccountId || !accessToken) {
    return res.status(400).json({
      error: true,
      message: 'platformAccountId và accessToken không được để trống.'
    });
  }

  if (accountType && !['personal', 'admin_system'].includes(accountType)) {
    return res.status(400).json({
      error: true,
      message: 'accountType phải là personal hoặc admin_system.'
    });
  }

  next();
};

const validateCreatePost = (req, res, next) => {
  const { accountId, mediaType, mediaUrls, caption } = req.body;

  if (!accountId) {
    return res.status(400).json({
      error: true,
      message: 'accountId (kênh đăng bài) không được để trống.'
    });
  }

  const validMediaTypes = ['image', 'video', 'carousel', 'poster'];
  if (!mediaType || !validMediaTypes.includes(mediaType.toLowerCase())) {
    return res.status(400).json({
      error: true,
      message: `mediaType không hợp lệ. Hỗ trợ: ${validMediaTypes.join(', ')}`
    });
  }

  if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    return res.status(400).json({
      error: true,
      message: 'mediaUrls phải là một danh sách đường dẫn/file hợp lệ (mảng ít nhất 1 phần tử).'
    });
  }

  if (req.body.scheduledAt) {
    const scheduleDate = new Date(req.body.scheduledAt);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        error: true,
        message: 'scheduledAt không đúng định dạng ngày giờ (ISO format).'
      });
    }
  }

  next();
};

const validateReviewPost = (req, res, next) => {
  const { status, reviewNote } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
    return res.status(400).json({
      error: true,
      message: 'status phê duyệt phải là APPROVED hoặc REJECTED.'
    });
  }

  if (status.toUpperCase() === 'REJECTED' && (!reviewNote || reviewNote.trim() === '')) {
    return res.status(400).json({
      error: true,
      message: 'Vui lòng cung cấp lý do từ chối (reviewNote).'
    });
  }

  next();
};

module.exports = {
  validateConnectAccount,
  validateCreatePost,
  validateReviewPost
};
