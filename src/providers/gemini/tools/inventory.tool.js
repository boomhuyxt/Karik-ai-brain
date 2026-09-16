const inventoryQueryService = require('../../../services/inventory/inventoryQuery.service');
const stockAlertService = require('../../../services/inventory/stockAlert.service');

// Định nghĩa Function Calling Tool cho Gemini AI
const inventoryDeclarations = [
  {
    name: 'check_warehouse_inventory',
    description: 'Tra cứu số lượng tồn kho, giá bán, vị trí lưu kho và tính tương thích của sản phẩm (dầu nhớt, phụ tùng xe máy, hàng hóa) dựa trên câu hỏi của khách hàng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Nội dung câu hỏi hoặc tên sản phẩm/dòng xe cần tìm (Ví dụ: "nhớt cho xe wave", "bugi chân dài", "nhớt xe air blade")'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'update_warehouse_stock',
    description: 'Cập nhật trừ số lượng hàng trong kho sau khi bán hoặc chốt đơn, đồng thời gửi cảnh báo cho chủ shop nếu tồn kho thấp.',
    parameters: {
      type: 'OBJECT',
      properties: {
        idOrSku: {
          type: 'STRING',
          description: 'Mã SKU hoặc ID của sản phẩm cần trừ kho'
        },
        quantity: {
          type: 'NUMBER',
          description: 'Số lượng sản phẩm vừa bán'
        },
        reason: {
          type: 'STRING',
          description: 'Lý do hoặc ghi chú đơn hàng'
        }
      },
      required: ['idOrSku', 'quantity']
    }
  }
];

async function handleInventoryToolCall(functionName, args) {
  if (functionName === 'check_warehouse_inventory') {
    return await inventoryQueryService.queryStock(args.query);
  }
  if (functionName === 'update_warehouse_stock') {
    return await stockAlertService.updateStock(args.idOrSku, args.quantity, args.reason);
  }
  return null;
}

module.exports = {
  inventoryDeclarations,
  handleInventoryToolCall
};
