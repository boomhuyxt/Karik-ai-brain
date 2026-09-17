const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const shopKnowledgeRepo = require('../../src/repositories/shopKnowledge.repository');

describe('--- File Manager & Header Rearrangement Test Suite ---', () => {

  it('1. Header HTML should remove search input and position Giám Sát & Rủi Ro first, then Quản Lý File Upload', () => {
    const headerPath = path.join(__dirname, '../../public/components/header.html');
    const headerHtml = fs.readFileSync(headerPath, 'utf8');

    // Không còn ô tìm kiếm note/tag trong header nữa
    assert.strictEqual(headerHtml.includes('id="graphSearchInput"'), false);
    assert.strictEqual(headerHtml.includes('id="graphSearchInputMobile"'), false);

    // Có nút Giám Sát & Rủi Ro và Quản Lý File Upload
    assert.ok(headerHtml.includes('id="btnSystemMonitor"'));
    assert.ok(headerHtml.includes('id="btnManageFiles"'));
    assert.ok(headerHtml.includes('Quản Lý File Upload'));

    // Giám Sát & Rủi Ro đứng trước Quản Lý File Upload
    const monitorIdx = headerHtml.indexOf('id="btnSystemMonitor"');
    const filesIdx = headerHtml.indexOf('id="btnManageFiles"');
    const usersIdx = headerHtml.indexOf('id="btnManageUsers"');

    assert.ok(monitorIdx < filesIdx, 'btnSystemMonitor must be before btnManageFiles');
    assert.ok(filesIdx < usersIdx, 'btnManageFiles must be before btnManageUsers');
  });

  it('2. FileManager Modal component and JS script should exist with required functions', () => {
    const modalPath = path.join(__dirname, '../../public/components/fileManagerModal.html');
    const jsPath = path.join(__dirname, '../../public/js/fileManager.js');

    assert.ok(fs.existsSync(modalPath), 'fileManagerModal.html must exist');
    assert.ok(fs.existsSync(jsPath), 'fileManager.js must exist');

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    assert.ok(jsContent.includes('openFileManagerModal'));
    assert.ok(jsContent.includes('closeFileManagerModal'));
    assert.ok(jsContent.includes('fetchAndRenderFileManagerFiles'));
    assert.ok(jsContent.includes('previewFmFile'));
    assert.ok(jsContent.includes('deleteFmFile'));
  });

  it('3. Repository getAllFiles and deleteFile should function correctly', async () => {
    // Thêm 1 file giả lập vào repo
    const mockFile = await shopKnowledgeRepo.saveFileRecord({
      id: 'test_file_mgr_01',
      shop_id: 'shop_test_mgr',
      file_name: 'test_kho.xlsx',
      file_path: 'kho/test_kho.xlsx',
      inventory_data: [
        { name: 'Sản phẩm 1', sku: 'SP-01', quantity: 10, price: 100000 },
        { name: 'Sản phẩm 2', sku: 'SP-02', quantity: 0, price: 50000 }
      ]
    });

    const allFiles = await shopKnowledgeRepo.getAllFiles();
    assert.ok(allFiles.length >= 1);
    const found = allFiles.find(f => f.id === mockFile.id);
    assert.ok(found);
    assert.strictEqual(found.shop_id, 'shop_test_mgr');

    // Xóa file
    const delResult = await shopKnowledgeRepo.deleteFile(mockFile.id);
    assert.strictEqual(delResult.success, true);

    const afterDel = await shopKnowledgeRepo.getAllFiles();
    const afterFound = afterDel.find(f => f.id === mockFile.id);
    assert.strictEqual(afterFound, undefined);
  });

  it('4. index.html & graphview.html should load fileManagerModal and script properly', () => {
    const indexPath = path.join(__dirname, '../../public/index.html');
    const graphPath = path.join(__dirname, '../../public/graphview.html');

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const graphHtml = fs.readFileSync(graphPath, 'utf8');

    assert.ok(indexHtml.includes('id="fileManagerModalContainer"'));
    assert.ok(indexHtml.includes('/components/fileManagerModal.html'));
    assert.ok(indexHtml.includes('/js/fileManager.js'));

    assert.ok(graphHtml.includes('id="fileManagerModalContainer"'));
    assert.ok(graphHtml.includes('/components/fileManagerModal.html'));
    assert.ok(graphHtml.includes('/js/fileManager.js'));
  });

});
