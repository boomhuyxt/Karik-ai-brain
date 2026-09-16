const { handleInventoryToolCall } = require('./tools/inventory.tool');

async function executeFunction(functionName, args) {
  // 1. Kiểm tra tool kho hàng / inventory
  const inventoryResult = await handleInventoryToolCall(functionName, args);
  if (inventoryResult !== null) {
    return inventoryResult;
  }

  return { status: 'success', functionName, args, result: 'Executed function successfully' };
}

module.exports = { executeFunction };
