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

    const graphviewHtml = fs.readFileSync(path.join(__dirname, '../../public/graphview.html'), 'utf8');
    assert.ok(graphviewHtml.includes('fabric.min.js'), 'graphview.html should include Fabric.js CDN');
    assert.ok(graphviewHtml.includes('imageEditorModalContainer'), 'graphview.html should have modal container');
    assert.ok(graphviewHtml.includes('imageEditor.js'), 'graphview.html should load imageEditor.js');
  });
});
