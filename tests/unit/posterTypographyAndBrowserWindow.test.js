const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const obsidianPosterService = require('../../src/services/image/obsidianPoster.service');

describe('Poster Typography Centering, Vietnamese Fonts & Browser Bot Window', () => {
  test('All backdrops have center-aligned safeZone to prevent text clipping', () => {
    const catalog = obsidianPosterService.getBackdrops();
    assert.ok(catalog.length >= 24);
    for (const bd of catalog) {
      assert.equal(
        bd.safeZone.align,
        'center',
        `Backdrop ${bd.id} must have safeZone.align === 'center' to prevent cut-off text`
      );
    }
  });

  test('buildPosterConfig produces center-aligned typography with safe margins', () => {
    const backdrop = obsidianPosterService.getBackdropById('XE-01');
    const config = obsidianPosterService.buildPosterConfig({
      backdrop,
      brief: 'Nhớt Wolver Racing chính hãng',
      copy: {
        title: 'NHỚT WOLVER RACING 4T',
        subtitle: 'Bảo vệ động cơ bứt tốc vượt trội',
        badge: 'HÀNG CHÍNH HÃNG 100%',
        cta: 'MUA NGAY HÔM NAY'
      }
    });

    const headline = config.layers.find(l => l.id === 'headline');
    assert.ok(headline);
    assert.equal(headline.align, 'center');
    assert.equal(headline.x, 50);
    assert.ok(headline.width >= 88);

    const subtitle = config.layers.find(l => l.id === 'subtitle');
    assert.ok(subtitle);
    assert.equal(subtitle.align, 'center');
    assert.equal(subtitle.x, 50);

    const badge = config.layers.find(l => l.id === 'badge_text');
    assert.ok(badge);
    assert.equal(badge.align, 'center');
    assert.equal(badge.x, 50);

    const cta = config.layers.find(l => l.id === 'cta_label');
    assert.ok(cta);
    assert.equal(cta.align, 'center');
    assert.equal(cta.x, 50);
  });

  test('imageEditor.js contains resolveVietnameseSafeFont and center alignment enforcement', () => {
    const jsPath = path.join(__dirname, '../../public/js/imageEditor.js');
    const content = fs.readFileSync(jsPath, 'utf8');

    assert.ok(content.includes('resolveVietnameseSafeFont'), 'imageEditor.js must define resolveVietnameseSafeFont');
    assert.ok(content.includes('Be Vietnam Pro'), 'imageEditor.js must include Be Vietnam Pro fallback');
    assert.ok(content.includes('forceCenter'), 'imageEditor.js must force center alignment for headings and slogans');
  });

  test('socialPublishModal.html and socialPublish.js enable opening browser window by default', () => {
    const modalPath = path.join(__dirname, '../../public/components/socialPublishModal.html');
    const modalHtml = fs.readFileSync(modalPath, 'utf8');
    assert.ok(modalHtml.includes('id="chkShowBrowserWindow"'), 'Modal must have chkShowBrowserWindow toggle');
    assert.ok(modalHtml.includes('checked'), 'Browser window toggle should be checked by default');

    const jsPath = path.join(__dirname, '../../public/js/socialPublish.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    assert.ok(jsContent.includes('chkShowBrowserWindow'), 'socialPublish.js must read chkShowBrowserWindow');
    assert.ok(jsContent.includes('isHeadless = showBrowserToggle ? !showBrowserToggle.checked : (headlessToggle ? headlessToggle.checked : false)'), 'Must default isHeadless to false');
  });

  test('facebookBrowserBot and tiktokBrowserBot use native CDP clicks and extended upload polling', () => {
    const fbBotPath = path.join(__dirname, '../../src/services/social/facebookBrowserBot.service.js');
    const fbContent = fs.readFileSync(fbBotPath, 'utf8');
    assert.ok(fbContent.includes('data-karik-post-target'), 'FB bot must mark target button');
    assert.ok(fbContent.includes('page.mouse.click'), 'FB bot must use native CDP hardware click');
    assert.ok(fbContent.includes('attempt <= 35'), 'FB bot must wait up to 35 attempts for image upload');
    assert.ok(fbContent.includes('page.keyboard.press(\'Enter\')'), 'FB bot must dispatch Enter key to WAI-ARIA button');
    assert.ok(fbContent.includes('foundDisabled'), 'FB bot must detect and handle temporarily disabled buttons during upload');
    assert.ok(fbContent.includes('modalClosed'), 'FB bot must verify composer dialog closure after clicking post');

    const ttBotPath = path.join(__dirname, '../../src/services/social/tiktokBrowserBot.service.js');
    const ttContent = fs.readFileSync(ttBotPath, 'utf8');
    assert.ok(ttContent.includes('data-karik-tiktok-target'), 'TikTok bot must mark target button');
    assert.ok(ttContent.includes('page.mouse.click'), 'TikTok bot must use native CDP hardware click');
  });
});

