const express = require('express');
const router = express.Router();

const socialController = require('../controllers/social.controller');
const {
  validateConnectAccount,
  validateCreatePost,
  validateReviewPost
} = require('../validations/social.validation');

// 1. Quản lý tài khoản mạng xã hội liên kết
router.post('/accounts', validateConnectAccount, (req, res, next) => socialController.connectAccount(req, res, next));
router.get('/channels', (req, res, next) => socialController.getAvailableChannels(req, res, next));
router.delete('/accounts/:id', (req, res, next) => socialController.disconnectAccount(req, res, next));

// 2. Quản lý bài đăng (Poster, Video, Ảnh)
router.post('/posts', validateCreatePost, (req, res, next) => socialController.createPost(req, res, next));
router.post('/direct-publish', (req, res, next) => socialController.directPublish(req, res, next));
router.post('/browser-bot/facebook', (req, res, next) => socialController.runFacebookBrowserBot(req, res, next));
router.get('/posts/me', (req, res, next) => socialController.getMyPosts(req, res, next));
router.post('/posts/:postId/publish-now', (req, res, next) => socialController.publishNow(req, res, next));

// 3. Quản trị & Phê duyệt bài đăng (Admin)
router.get('/admin/pending', (req, res, next) => socialController.getPendingApprovals(req, res, next));
router.post('/admin/posts/:postId/review', validateReviewPost, (req, res, next) => socialController.reviewPost(req, res, next));

module.exports = router;
