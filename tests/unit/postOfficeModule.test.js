const test = require('node:test');
const assert = require('node:assert/strict');
const shopKnowledgeRepo = require('../../src/repositories/shopKnowledge.repository');
const userRepo = require('../../src/repositories/user.repository');

test('Post Office & 3-Tier Role Management Suite', async (t) => {
  const testShopId = `test_shop_${Date.now()}`;
  const testFileId = `file_test_${Date.now()}`;

  // Seed knowledge file with products
  shopKnowledgeRepo.memoryFiles.set(testFileId, {
    id: testFileId,
    shop_id: testShopId,
    file_name: 'test_products.xlsx',
    file_path: 'https://test.supabase.co/storage/v1/object/public/kho/test.xlsx',
    inventory_data: [
      {
        id: 'SP001',
        sku: 'AO-THUN-01',
        name: 'Áo Thun Nam Cotton Cao Cấp',
        quantity: 50,
        price: 150000,
        category: 'Thời trang'
      },
      {
        id: 'SP002',
        sku: 'GIAY-SNK-01',
        name: 'Giày Sneaker Nam Thể Thao',
        quantity: 20,
        price: 450000,
        category: 'Giày dép'
      }
    ],
    notifications: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await t.test('1. Customer places order -> Creates notification with tracking number and PENDING status', async () => {
    const deductRes = await shopKnowledgeRepo.deductStockAndNotify(
      testShopId,
      'AO-THUN-01',
      2,
      'Khách hàng Nguyễn Văn A - 0987654321 - 123 Đường Cầu Giấy, Hà Nội đặt mua',
      {
        order_id: 'ORD-TEST-001',
        customer_name: 'Nguyễn Văn A',
        customer_phone: '0987654321',
        customer_address: '123 Đường Cầu Giấy, Hà Nội',
        unit_price: 150000,
        total_amount: 300000
      }
    );

    assert.equal(deductRes.success, true);
    assert.equal(deductRes.item.quantity, 48);
    assert.ok(deductRes.notification.tracking_number);
    assert.match(deductRes.notification.tracking_number, /^VN/);
    assert.equal(deductRes.notification.order_status, 'PENDING');
    assert.equal(deductRes.notification.customer_name, 'Nguyễn Văn A');
    assert.equal(deductRes.notification.total_amount, 300000);
  });

  await t.test('2. Post Office fetches all orders across shops', async () => {
    const allOrders = await shopKnowledgeRepo.getAllOrders();
    assert.ok(Array.isArray(allOrders));
    assert.ok(allOrders.length >= 1);

    const targetOrder = allOrders.find(o => o.order_id === 'ORD-TEST-001');
    assert.ok(targetOrder, 'Target order should exist in Post Office orders list');
    assert.equal(targetOrder.item_name, 'Áo Thun Nam Cotton Cao Cấp');
    assert.equal(targetOrder.quantity_sold, 2);
  });

  await t.test('3. Post Office updates order status to PRINTED and then SHIPPED', async () => {
    const updateRes1 = await shopKnowledgeRepo.updateOrderStatus('ORD-TEST-001', 'PRINTED');
    assert.equal(updateRes1.success, true);
    assert.equal(updateRes1.order.order_status, 'PRINTED');

    const updateRes2 = await shopKnowledgeRepo.updateOrderStatus('ORD-TEST-001', 'SHIPPED');
    assert.equal(updateRes2.success, true);
    assert.equal(updateRes2.order.order_status, 'SHIPPED');
  });

  await t.test('4. Role Assignment supports 3 Roles: ADMIN (1), USER/Shop (0), POST_OFFICE (2)', async () => {
    const testUserId = `test_usr_${Date.now()}`;
    const testEmail = `logistics_${Date.now()}@example.com`;

    userRepo.memoryUsers.set(testEmail, {
      id: testUserId,
      email: testEmail,
      fullName: 'Bưu Cục Viên Trưởng',
      role: '0',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    // Promote to POST_OFFICE ('2')
    await userRepo.updateUserRole(testUserId, '2');
    let user = await userRepo.findById(testUserId);
    assert.equal(user.role, '2');

    // Switch to ADMIN ('1')
    await userRepo.updateUserRole(testUserId, '1');
    user = await userRepo.findById(testUserId);
    assert.equal(user.role, '1');

    // Revert to USER/Shop ('0')
    await userRepo.updateUserRole(testUserId, '0');
    user = await userRepo.findById(testUserId);
    assert.equal(user.role, '0');
  });

  // Cleanup
  shopKnowledgeRepo.memoryFiles.delete(testFileId);
});
