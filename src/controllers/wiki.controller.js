const wikiService = require('../services/knowledge/wiki.service');

class WikiController {
  async getNotes(req, res, next) {
    try {
      const notes = await wikiService.getAllNotes();
      res.json(notes);
    } catch (err) {
      next(err);
    }
  }

  async getNoteById(req, res, next) {
    try {
      const note = await wikiService.getWikiNote(req.params.id);
      res.json(note);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WikiController();
