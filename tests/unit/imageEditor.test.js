const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Image & Poster Editor Studio Module', () => {
  test('Component HTML file exists and contains 3-column layout elements', () => {
    const modalPath = path.join(__dirname, '../../public/components/imageEditorModal.html');
    assert.ok(fs.existsSync(modalPath), 'imageEditorModal.html should exist');

    const html = fs.readFileSync(modalPath, 'utf8');
    
    // Check 3 columns
    assert.ok(html.includes('id="imageEditorModal"'), 'Should have main modal container');
    assert.ok(html.includes('tab-upload'), 'Should have Image upload tab');
    assert.ok(html.includes('tab-text'), 'Should have Text typography tab');
    assert.ok(html.includes('tab-shapes'), 'Should have Shapes tab');
    assert.ok(html.includes('tab-adjust'), 'Should have Adjustments/Filters tab');
    assert.ok(html.includes('tab-transform'), 'Should have Crop & Rotate tab');
    assert.ok(html.includes('tab-background'), 'Should have Background removal tab');
    
    // Check Canvas stage
    assert.ok(html.includes('id="fabricCanvas"'), 'Should have fabric canvas element');
    assert.ok(html.includes('id="canvasPresetSelect"'), 'Should have canvas presets selector');
    assert.ok(html.includes('id="canvasDimensionDisplay"'), 'Should have dimension display');

    // Check Layers & Export
    assert.ok(html.includes('id="studioLayersList"'), 'Should have layers list');
    assert.ok(html.includes('id="btnDownloadImage"'), 'Should have Download button');
    assert.ok(html.includes('id="btnSendToChat"'), 'Should have Send to Chat button');
    assert.ok(html.includes('id="btnPostFacebookFromStudio"'), 'Should have Post Facebook button in Studio');
    assert.ok(html.includes('id="btnSaveAndContinueStudio"'), 'Should save the final poster and continue to publishing');
    assert.ok(html.includes('id="bgDetailProtection"'), 'Should expose detail protection for background removal');
  });

  test('JavaScript engine file exists and exposes global API', () => {
    const jsPath = path.join(__dirname, '../../public/js/imageEditor.js');
    assert.ok(fs.existsSync(jsPath), 'imageEditor.js should exist');

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    assert.ok(jsContent.includes('window.initImageEditorModule'), 'Should export initImageEditorModule');
    assert.ok(jsContent.includes('window.openImageEditor'), 'Should export openImageEditor');
    assert.ok(jsContent.includes('window.closeImageEditor'), 'Should export closeImageEditor');
    assert.ok(jsContent.includes('window.createPosterFromImage'), 'Should export createPosterFromImage');
    assert.ok(jsContent.includes('window.autoBuildAndSendPoster'), 'Should export autoBuildAndSendPoster');
    assert.ok(jsContent.includes('fabric.Canvas'), 'Should use Fabric.js Canvas');
    assert.ok(jsContent.includes('processClientSideBackgroundRemoval'), 'Should include background removal engine');
    assert.ok(jsContent.includes('posterRenderVersion'), 'Should discard stale asynchronous poster renders');
    assert.ok(jsContent.includes('new fabric.Textbox'), 'Should wrap and auto-fit generated poster typography');
    assert.ok(jsContent.includes('window.saveStudioPoster'), 'Should expose the save-and-exit workflow');
    assert.ok(jsContent.includes("window.dispatchEvent(new CustomEvent('studio:image-saved'"), 'Should notify downstream publishing UI after save');
  });

  test('Personalized hybrid workflow exposes preferences, history and AI controls', () => {
    const personalizationPath = path.join(__dirname, '../../public/js/imageStudioPersonalization.js');
    const personalizationJs = fs.readFileSync(personalizationPath, 'utf8');
    const modalHtml = fs.readFileSync(path.join(__dirname, '../../public/components/imageEditorModal.html'), 'utf8');

    assert.ok(personalizationJs.includes('imageStudioPersonalization'), 'Should expose personalization API');
    assert.ok(personalizationJs.includes('/api/image/design'), 'Should request diverse design variants');
    assert.ok(personalizationJs.includes('/api/image/generate'), 'Should generate a text-free key visual');
    assert.ok(modalHtml.includes('id="studioCreativeBrief"'), 'Should include creative brief input');
    assert.ok(modalHtml.includes('id="btnStudioCreateVariants"'), 'Should include variant action');
    assert.ok(modalHtml.includes('id="btnStudioGenerateVisual"'), 'Should include hybrid generation action');
  });

  test('Chat component and JS include Studio button and bridge', () => {
    const chatHtmlPath = path.join(__dirname, '../../public/components/chat.html');
    const chatHtml = fs.readFileSync(chatHtmlPath, 'utf8');
    assert.ok(chatHtml.includes('btnOpenImageEditorHeader'), 'Chat header should have Studio button');
    assert.ok(chatHtml.includes('btnOpenImageEditorFooter'), 'Chat footer should have Studio button');

    const chatJsPath = path.join(__dirname, '../../public/js/chat.js');
    const chatJs = fs.readFileSync(chatJsPath, 'utf8');
    assert.ok(chatJs.includes('window.attachStudioImageToChat'), 'Chat should expose bridge for studio images');
    assert.ok(chatJs.includes('window.receiveCompletedPosterFromStudio'), 'Chat should expose bridge to receive completed posters');
  });

  test('index.html and graphview.html load Fabric.js and imageEditor component', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
    assert.ok(indexHtml.includes('fabric.min.js'), 'index.html should include Fabric.js CDN');
    assert.ok(indexHtml.includes('imageEditorModalContainer'), 'index.html should have modal container');
    assert.ok(indexHtml.includes('imageEditor.js'), 'index.html should load imageEditor.js');
    assert.ok(indexHtml.includes('imageBackgroundRemoval.js'), 'index.html should load edge-aware background removal');

    const graphviewHtml = fs.readFileSync(path.join(__dirname, '../../public/graphview.html'), 'utf8');
    assert.ok(graphviewHtml.includes('fabric.min.js'), 'graphview.html should include Fabric.js CDN');
    assert.ok(graphviewHtml.includes('imageEditorModalContainer'), 'graphview.html should have modal container');
    assert.ok(graphviewHtml.includes('imageEditor.js'), 'graphview.html should load imageEditor.js');
    assert.ok(graphviewHtml.includes('imageBackgroundRemoval.js'), 'graphview.html should load edge-aware background removal');
  });
  test('Picsart poster templates gallery is integrated in modal and JS engine', () => {
    const modalPath = path.join(__dirname, '../../public/components/imageEditorModal.html');
    const html = fs.readFileSync(modalPath, 'utf8');
    assert.ok(html.includes('id="picsartTemplatesSection"'), 'Should have Picsart templates section');
    assert.ok(html.includes('id="picsartTemplatesGrid"'), 'Should have Picsart templates grid');
    assert.ok(html.includes('id="picsartCategoryFilters"'), 'Should have category filters');
    assert.ok(html.includes('id="btnJumpToPicsartGallery"'), 'Should have jump to gallery button in style tab');

    const jsPath = path.join(__dirname, '../../public/js/imageEditor.js');
    const js = fs.readFileSync(jsPath, 'utf8');
    assert.ok(js.includes('setupPicsartTemplatesGallery'), 'Should setup Picsart gallery');
    assert.ok(js.includes('window.insertPicsartPoster'), 'Should expose insertPicsartPoster');
    assert.ok(js.includes('window.setCanvasBackgroundFromUrl'), 'Should expose setCanvasBackgroundFromUrl');
    assert.ok(js.includes('window.applyPicsartCreativeBrief'), 'Should expose applyPicsartCreativeBrief');
    assert.ok(js.includes('window.buildPosterFromProductAndTemplate'), 'Should expose buildPosterFromProductAndTemplate');
    assert.ok(js.includes('window.compositeProductWithTemplate'), 'Should expose compositeProductWithTemplate');
    assert.ok(js.includes('window.autoMatchAndCompositePoster'), 'Should expose autoMatchAndCompositePoster');
    assert.ok(html.includes('id="btnAutoMatchPicsart"'), 'Should have AI Auto Match banner in modal');

    const metadataPath = path.join(__dirname, '../../public/templates/posters/posters.json');
    assert.ok(fs.existsSync(metadataPath), 'posters.json metadata must exist');
    const posters = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    assert.ok(posters.length >= 30, 'Should have at least 30 downloaded poster templates');
  });

  test('ImageEditor JS includes XE_BACKDROPS and robust product name extraction', () => {
    const jsPath = path.join(__dirname, '../../public/js/imageEditor.js');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.ok(js.includes('window.XE_BACKDROPS'), 'Should expose window.XE_BACKDROPS');
    assert.ok(js.includes('window.getRandomXeBackdrop'), 'Should expose window.getRandomXeBackdrop');
    assert.ok(js.includes('window.randomizeXeBackdrop'), 'Should expose window.randomizeXeBackdrop');
    assert.ok(js.includes('XE-01'), 'Should define XE-01');
    assert.ok(js.includes('XE-08'), 'Should define XE-08');
    assert.ok(js.includes('raw/n%E1%BB%81n%20poster/xe/'), 'Should reference Obsidian Xe backdrops');

    const modalPath = path.join(__dirname, '../../public/components/imageEditorModal.html');
    const modalHtml = fs.readFileSync(modalPath, 'utf8');
    assert.ok(modalHtml.includes('id="btnRandomXeBackdrop"'), 'Modal should have btnRandomXeBackdrop in background tab');
    assert.ok(modalHtml.includes('id="btnRandomXeBackdropQuick"'), 'Modal should have btnRandomXeBackdropQuick in template section');

    const chatPath = path.join(__dirname, '../../public/js/chat.js');
    const chatJs = fs.readFileSync(chatPath, 'utf8');
    assert.ok(chatJs.includes('window.randomizeXeBackdrop()'), 'Chat action card should have Random Nền Xe button');
  });
});

