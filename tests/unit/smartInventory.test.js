const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');

const excelParserService = require('../../src/services/inventory/excelParser.service');
const vectorSyncService = require('../../src/services/inventory/vectorSync.service');
const inventoryRepo = require('../../src/repositories/inventory.repository');
const inventoryQueryService = require('../../src/services/inventory/inventoryQuery.service');
const stockAlertService = require('../../src/services/inventory/stockAlert.service');
const { handleInventoryToolCall } = require('../../src/providers/gemini/tools/inventory.tool');

describe('--- Smart Inventory RAG & Auto-Alert Test Suite ---', () => {

  it('1. Should correctly parse Excel/CSV data with flexible Vietnamese column headers', () => {
    // Giả lập file Excel tạo bằng thư viện XLSX
    const mockData = [
      {
        'Tên sản phẩm': 'Nhớt Motul 3100 Silver 4T 0.8L',
        'Mã SKU': 'OIL-MOTUL-3100',
        'Phân loại': 'Dầu nhớt',
        'Dòng xe tương thích': 'Wave Alpha, Wave RSX, Future, Sirius, Jupiter',
        'Số lượng tồn': 15,
        'Đơn vị tính': 'chai',
        'Giá bán lẻ': 105000,
        'Giá nhập': 80000,
        'Vị trí': 'Kệ A3',
        'Cảnh báo tồn': 5,
        'Mô tả': 'Nhớt xe số chất lượng cao'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(mockData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsed = excelParserService.parseExcel(buffer);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].name, 'Nhớt Motul 3100 Silver 4T 0.8L');
    assert.strictEqual(parsed[0].sku, 'OIL-MOTUL-3100');
    assert.strictEqual(parsed[0].quantity, 15);
    assert.strictEqual(parsed[0].price, 105000);
    assert.strictEqual(parsed[0].compatible_models, 'Wave Alpha, Wave RSX, Future, Sirius, Jupiter');
    assert.strictEqual(parsed[0].status, 'in_stock');
  });

  it('2. Should generate semantic text and sync vectors properly', async () => {
    const item = {
      id: 'test_item_wave',
      sku: 'TEST-WAVE-01',
      name: 'Nhớt Shell Advance AX7 4T 0.8L',
      category: 'Dầu nhớt',
      compatible_models: 'Honda Wave, Yamaha Sirius',
      price: 110000,
      location: 'Kệ A1',
      description: 'Dầu nhớt bán tổng hợp cho xe số'
    };

    const chunk = vectorSyncService.generateSemanticChunk(item);
    assert.ok(chunk.includes('Nhớt Shell Advance AX7'));
    assert.ok(chunk.includes('Honda Wave, Yamaha Sirius'));

    await inventoryRepo.upsert(item);
    const syncResult = await vectorSyncService.syncItemVector(item);
    assert.ok(syncResult);
    assert.strictEqual(syncResult.item_id, item.id);
  });

  it('3. Should query stock accurately using Natural Language (Wave query)', async () => {
    const query = 'chai nhớt dùng cho xe Wave còn không?';
    const result = await inventoryQueryService.queryStock(query);

    assert.strictEqual(result.found, true);
    assert.ok(result.products.length > 0);
    assert.ok(result.reply.includes('CÒN HÀNG') || result.reply.includes('TẠM HẾT HÀNG'));
  });

  it('4. Should deduct stock and generate Critical/Warning alert for owner when stock gets low', async () => {
    // Thêm sản phẩm có sẵn 4 chai, ngưỡng min = 3
    const item = await inventoryRepo.upsert({
      id: 'test_alert_item',
      sku: 'TEST-ALERT-01',
      name: 'Vỏ xe Michelin City Extra 70/90-17',
      category: 'Vỏ xe',
      compatible_models: 'Wave, Future, Sirius',
      quantity: 4,
      unit: 'cái',
      min_threshold: 3,
      price: 450000
    });

    // Bán 2 cái -> Tồn kho còn 2 (dưới ngưỡng 3) -> Phải phát cảnh báo WARNING
    const saleResult = await stockAlertService.updateStock('TEST-ALERT-01', 2, 'Khách mua tại quầy');
    assert.strictEqual(saleResult.item.quantity, 2);
    assert.strictEqual(saleResult.item.status, 'low_stock');
    assert.strictEqual(saleResult.alert.level, 'WARNING');
    assert.ok(saleResult.alert.message.includes('CẢNH BÁO TỒN THẤP'));

    // Bán tiếp 2 cái -> Tồn kho còn 0 -> Phải phát cảnh báo CRITICAL (HẾT HÀNG)
    const outResult = await stockAlertService.updateStock('TEST-ALERT-01', 2, 'Đơn online');
    assert.strictEqual(outResult.item.quantity, 0);
    assert.strictEqual(outResult.item.status, 'out_of_stock');
    assert.strictEqual(outResult.alert.level, 'CRITICAL');
    assert.ok(outResult.alert.message.includes('HẾT HÀNG'));
  });

  it('5. Should work seamlessly with Gemini Function Calling AI Tool', async () => {
    const res = await handleInventoryToolCall('check_warehouse_inventory', {
      query: 'nhớt xe máy Wave'
    });
    assert.ok(res);
    assert.strictEqual(res.found, true);
  });
});
