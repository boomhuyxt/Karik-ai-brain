const XLSX = require('xlsx');

class ExcelParserService {
  /**
   * Parse file Excel / CSV từ Buffer hoặc Base64
   * @param {Buffer|string} input - Buffer file hoặc chuỗi Base64
   * @returns {Array<Object>} Mảng các mặt hàng đã chuẩn hóa
   */
  parseExcel(input) {
    let buffer;
    if (typeof input === 'string') {
      // Chuỗi Base64
      const base64Data = input.includes('base64,') ? input.split('base64,')[1] : input;
      buffer = Buffer.from(base64Data, 'base64');
    } else if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      throw new Error('Dữ liệu file không hợp lệ (cần Buffer hoặc Base64).');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel không có trang tính (Sheet) nào.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('File Excel không có dữ liệu.');
    }

    return this.normalizeRows(rawRows);
  }

  /**
   * Tự động nhận diện và map tên cột tiếng Việt/Anh sang schema chuẩn
   */
  normalizeRows(rawRows) {
    return rawRows.map((row, index) => {
      const getVal = (possibleKeys) => {
        for (const key of possibleKeys) {
          // So khớp không phân biệt hoa thường và khoảng trắng
          const foundKey = Object.keys(row).find(
            k => k.trim().toLowerCase() === key.toLowerCase()
          );
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
            return row[foundKey];
          }
        }
        return null;
      };

      const name = getVal(['Tên sản phẩm', 'Tên hàng', 'Tên mặt hàng', 'Tên', 'Product Name', 'Name', 'Item Name']) || `Sản phẩm dòng ${index + 1}`;
      const sku = getVal(['Mã sản phẩm', 'Mã hàng', 'Mã SP', 'Mã SKU', 'SKU', 'Item Code', 'Code']) || `SKU-${Date.now()}-${index + 1}`;
      const category = getVal(['Phân loại', 'Danh mục', 'Loại', 'Category', 'Group']) || 'Phụ tùng / Dầu nhớt';
      const compatible_models = getVal(['Dòng xe tương thích', 'Xe sử dụng', 'Dùng cho xe', 'Tương thích', 'Compatible Models', 'Models', 'Xe']) || '';
      const quantity = Number(getVal(['Số lượng tồn', 'Số lượng', 'Tồn kho', 'Số lượng còn', 'Quantity', 'Stock', 'Qty']) || 0);
      const unit = getVal(['Đơn vị tính', 'Đơn vị', 'DVT', 'Unit']) || 'cái';
      const price = Number(getVal(['Giá bán', 'Giá bán lẻ', 'Đơn giá', 'Price', 'Selling Price']) || 0);
      const cost_price = Number(getVal(['Giá vốn', 'Giá nhập', 'Cost Price', 'Cost']) || 0);
      const location = getVal(['Vị trí', 'Vị trí kho', 'Kệ', 'Khay', 'Tủ', 'Location']) || 'Kho chính';
      const min_threshold = Number(getVal(['Ngưỡng tối thiểu', 'Cảnh báo tồn', 'Min Threshold', 'Min Stock']) || 3);
      const description = getVal(['Mô tả', 'Ghi chú', 'Tính năng', 'Description', 'Notes']) || '';

      let status = 'in_stock';
      if (quantity <= 0) {
        status = 'out_of_stock';
      } else if (quantity <= min_threshold) {
        status = 'low_stock';
      }

      return {
        sku: String(sku).trim(),
        name: String(name).trim(),
        category: String(category).trim(),
        compatible_models: String(compatible_models).trim(),
        quantity: Math.max(0, quantity),
        unit: String(unit).trim(),
        price: Math.max(0, price),
        cost_price: Math.max(0, cost_price),
        location: String(location).trim(),
        min_threshold: Math.max(1, min_threshold),
        status,
        description: String(description).trim()
      };
    });
  }
}

module.exports = new ExcelParserService();
