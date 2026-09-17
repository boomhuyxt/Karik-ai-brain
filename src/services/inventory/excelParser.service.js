const XLSX = require('xlsx');

class ExcelParserService {
  /**
   * Parse file Excel / CSV từ Buffer hoặc Base64
   * Tự động nhận diện dòng Header kể cả khi file có dòng Tiêu đề lớn ở trên cùng (Row 1, 2, 3...)
   */
  parseExcel(input) {
    let buffer;
    if (typeof input === 'string') {
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
    // Đọc dạng mảng 2D để tìm dòng Header chuẩn xác
    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawMatrix || rawMatrix.length === 0) {
      throw new Error('File Excel không có dữ liệu.');
    }

    // 1. Tìm chỉ số dòng Header thực sự trong 10 dòng đầu
    let headerRowIndex = 0;
    const headerKeywords = ['tên', 'tên sản phẩm', 'tên hàng', 'mã sp', 'mã hàng', 'mã', 'sku', 'stt', 'tồn kho', 'số lượng', 'giá bán', 'đơn giá', 'product', 'item'];

    for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
      const row = rawMatrix[r];
      if (Array.isArray(row)) {
        const textRow = row.map(cell => String(cell || '').trim().toLowerCase());
        const matchCount = textRow.filter(cell => 
          headerKeywords.some(kw => cell.includes(kw))
        ).length;

        // Nếu dòng này có từ 2 cột trở lên khớp với keyword header -> đây chính là Header row!
        if (matchCount >= 2) {
          headerRowIndex = r;
          break;
        }
      }
    }

    const headers = (rawMatrix[headerRowIndex] || []).map(h => String(h || '').trim());
    const dataRows = [];

    // 2. Chuyển các dòng bên dưới Header thành Object
    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const rowValues = rawMatrix[r];
      if (!Array.isArray(rowValues) || rowValues.every(val => val === '' || val === null || val === undefined)) {
        continue; // Bỏ qua dòng trống
      }

      const rowObj = {};
      let hasMeaningfulData = false;

      headers.forEach((headerName, colIdx) => {
        const cellValue = rowValues[colIdx] !== undefined ? rowValues[colIdx] : '';
        const key = headerName || `Column_${colIdx}`;
        rowObj[key] = cellValue;
        if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
          hasMeaningfulData = true;
        }
      });

      if (hasMeaningfulData) {
        dataRows.push(rowObj);
      }
    }

    return this.normalizeRows(dataRows);
  }

  /**
   * Tự động nhận diện và map tên cột tiếng Việt/Anh sang schema chuẩn
   */
  normalizeRows(rawRows) {
    const junkRegex = /^(ghi chú|lưu ý|hướng dẫn|chú ý|tổng cộng|header|footer|note|cảnh báo|ô tồn kho)\b/i;

    return rawRows
      .filter(row => {
        const textValues = Object.values(row).map(v => String(v || '').trim()).join(' ');
        if (!textValues || junkRegex.test(textValues)) return false;
        return true;
      })
      .map((row, index) => {
        const getVal = (possibleKeys) => {
          for (const key of possibleKeys) {
            const cleanKey = key.trim().toLowerCase();
            const foundKey = Object.keys(row).find(k => {
              const cleanRowKey = k.trim().toLowerCase();
              return cleanRowKey === cleanKey || cleanRowKey.includes(cleanKey);
            });
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
              return row[foundKey];
            }
          }
          return null;
        };

        let name = getVal([
          'tên sản phẩm', 'tên hàng hóa', 'tên hàng', 'tên mặt hàng', 'tên phụ tùng',
          'tên vật tư', 'tên linh kiện', 'mặt hàng', 'sản phẩm', 'phụ tùng', 'tên',
          'product name', 'item name', 'name', 'mô tả'
        ]);

        if (!name) {
          const textValues = Object.values(row).filter(v => typeof v === 'string' && isNaN(v) && v.trim().length > 2);
          if (textValues.length > 0) {
            name = textValues.reduce((a, b) => a.length > b.length ? a : b);
          } else {
            name = `Sản phẩm dòng ${index + 1}`;
          }
        }

        const sku = getVal(['mã sp', 'mã sản phẩm', 'mã hàng', 'mã phụ tùng', 'mã sku', 'sku', 'code', 'mã']) || `SKU-${Date.now()}-${index + 1}`;
        const category = getVal(['danh mục', 'phân loại', 'loại hàng', 'loại phụ tùng', 'loại', 'category', 'group']) || 'Phụ tùng / Linh kiện';
        const compatible_models = getVal(['dòng xe', 'áp dụng cho xe', 'xe sử dụng', 'dùng cho xe', 'dùng cho', 'tương thích', 'loại xe', 'đời xe', 'models', 'xe']) || String(name);
        
        const rawQty = getVal(['tồn kho', 'số lượng tồn', 'số lượng thực tế', 'số lượng', 'sl tồn', 'sl', 'tồn', 'hiện có', 'quantity', 'stock', 'qty']);
        const quantity = rawQty !== null && !isNaN(rawQty) ? Number(rawQty) : 0;

        const unit = getVal(['đvt', 'đơn vị tính', 'đơn vị', 'dvt', 'unit']) || 'cái';
        
        const rawPrice = getVal(['giá bán', 'giá bán lẻ', 'giá niêm yết', 'đơn giá', 'thành tiền', 'giá', 'price']);
        const price = rawPrice !== null && !isNaN(rawPrice) ? Number(rawPrice) : 0;

        const rawCost = getVal(['giá nhập', 'giá vốn', 'cost price', 'cost']);
        const cost_price = rawCost !== null && !isNaN(rawCost) ? Number(rawCost) : 0;

        const location = getVal(['vị trí kho', 'vị trí', 'kệ', 'khay', 'tủ', 'location']) || 'Kho chính';
        const min_threshold = Number(getVal(['ngưỡng tối thiểu', 'cảnh báo tồn', 'tồn tối thiểu', 'min threshold']) || 3);
        const description = getVal(['mô tả', 'ghi chú', 'tính năng', 'nhà cung cấp', 'notes']) || '';

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
      })
      .filter(item => {
        if (!item.name || item.name.length < 2) return false;
        if (junkRegex.test(item.name)) return false;
        return true;
      });
  }
}

module.exports = new ExcelParserService();
