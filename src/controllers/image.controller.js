const geminiImageService = require('../services/providers/geminiImage.service');
const imageDesignService = require('../services/image/imageDesign.service');
const imageStudioRepository = require('../repositories/imageStudio.repository');

const obsidianPosterService = require('../services/image/obsidianPoster.service');

function requireUser(req) {
  if (req.user?.id) return req.user.id;
  const error = new Error('Vui lòng đăng nhập để đồng bộ hồ sơ Studio.');
  error.statusCode = 401;
  throw error;
}

class ImageController {
  getCatalog(req, res) {
    return res.json({ success: true, ...imageDesignService.getCatalog() });
  }

  getTemplates(req, res) {
    const category = req.query?.category;
    const templates = imageDesignService.getPicsartTemplates(category);
    return res.json({ success: true, count: templates.length, templates });
  }

  getObsidianTemplates(req, res) {
    const category = req.query?.category;
    const backdrops = obsidianPosterService.getBackdrops(category);
    return res.json({ success: true, count: backdrops.length, backdrops });
  }

  getTechniques(req, res) {
    const techniques = obsidianPosterService.getTechniques();
    return res.json({ success: true, count: techniques.length, techniques });
  }

  matchTemplate(req, res) {
    const brief = req.body?.brief || req.query?.brief || '';
    const preferences = req.body?.preferences || {};
    const result = imageDesignService.matchTemplateForProduct(brief, preferences);
    return res.json({ success: true, ...result });
  }

  matchObsidianTemplate(req, res) {
    const brief = req.body?.brief || req.query?.brief || '';
    const preferences = req.body?.preferences || {};
    const result = obsidianPosterService.matchBackdrop(brief, preferences);
    return res.json({ success: true, ...result });
  }

  createObsidianPoster(req, res) {
    const { backdropId, brief, copy, productImageUrl, options, techniqueId } = req.body || {};
    const backdrop = backdropId
      ? obsidianPosterService.getBackdropById(backdropId)
      : obsidianPosterService.matchBackdrop(brief, { ...req.body?.preferences, techniqueId }).backdrop;
    const posterConfig = obsidianPosterService.buildPosterConfig({
      backdrop,
      brief,
      copy,
      productImageUrl,
      options: { ...(options || {}), techniqueId, preferences: req.body?.preferences }
    });
    return res.json({ success: true, posterConfig });
  }

  async getProfile(req, res, next) {
    try {
      const userId = requireUser(req);
      const [preferences, history] = await Promise.all([
        imageStudioRepository.getProfile(userId),
        imageStudioRepository.getHistory(userId)
      ]);
      return res.json({ success: true, preferences, history });
    } catch (err) {
      return next(err);
    }
  }

  async saveProfile(req, res, next) {
    try {
      const userId = requireUser(req);
      const preferences = imageDesignService.normalizePreferences(req.body?.preferences);
      await imageStudioRepository.saveProfile(userId, preferences);
      return res.json({ success: true, preferences });
    } catch (err) {
      return next(err);
    }
  }

  async recordHistory(req, res, next) {
    try {
      const userId = requireUser(req);
      const [design] = imageDesignService.normalizeHistory([req.body?.design]);
      if (!design?.style || !design.layout || !design.palette) {
        const error = new Error('Design signature is required.');
        error.statusCode = 400;
        throw error;
      }
      design.signature = String(req.body.design.signature || `${design.style}:${design.layout}:${design.palette}`).slice(0, 160);
      const entry = await imageStudioRepository.addHistory(userId, design);
      return res.json({ success: true, entry });
    } catch (err) {
      return next(err);
    }
  }

  async createDesign(req, res, next) {
    try {
      let payload = req.body || {};
      if (req.user?.id) {
        const [savedPreferences, savedHistory] = await Promise.all([
          imageStudioRepository.getProfile(req.user.id),
          imageStudioRepository.getHistory(req.user.id)
        ]);
        payload = {
          ...payload,
          preferences: { ...savedPreferences, ...(payload.preferences || {}) },
          history: payload.history?.length ? payload.history : savedHistory
        };
      }
      const variants = imageDesignService.createDesignSet(payload);
      return res.json({ success: true, variants });
    } catch (err) {
      return next(err);
    }
  }

  async generateImage(req, res, next) {
    try {
      const variants = req.body.design
        ? [req.body.design]
        : imageDesignService.createDesignSet({ ...req.body, variantCount: 1 });
      const design = variants[0];
      if (!design?.keyVisual?.prompt) {
        const error = new Error('A valid hybrid poster design is required.');
        error.statusCode = 400;
        throw error;
      }
      const result = await geminiImageService.generateImage(design.keyVisual.prompt, {
        aspectRatio: req.body.aspectRatio || design.preset || '4:5'
      });
      if (!result?.imageData) {
        const error = new Error(result?.message || 'Image provider did not return an image.');
        error.statusCode = 503;
        throw error;
      }
      return res.json({ success: true, design, ...result });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ImageController();
