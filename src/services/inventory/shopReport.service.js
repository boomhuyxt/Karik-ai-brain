const XLSX = require('xlsx');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');
const { supabase } = require('../../config/supabase');

function getVietnamDateString(d = new Date()) {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return new Date().toISOString().split('T')[0];
  const vnTime = new Date(dateObj.getTime() + (7 * 60 + dateObj.getTimezoneOffset()) * 60000);
  const year = vnTime.getFullYear();
  const month = String(vnTime.getMonth() + 1).padStart(2, '0');
  const day = String(vnTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class ShopReportService {
  /**
   * Tạo báo cáo tổng hợp bán hàng & doanh thu trong ngày của Shop
   */
  async generateDailySalesReport(shop_id = 'default_shop', targetDate = null) {
    const todayStr = targetDate ? getVietnamDateString(targetDate) : getVietnamDateString(new Date());
    const notifications = await shopKnowledgeRepo.getNotifications(shop_id);

    // Lọc các thông báo phát sinh giao dịch trong ngày
    let todaySales = notifications.filter(n => {
      const notiDate = getVietnamDateString(n.sold_date || n.created_at || '');
      return notiDate === todayStr && (Number(n.quantity_sold || 0) > 0 || Number(n.total_price || 0) > 0);
    });

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const productSalesMap = new Map();

    for (const sale of todaySales) {
      const qty = Number(sale.quantity_sold || 1);
      const price = Number(sale.total_price || 0);
      totalRevenue += price;
      totalItemsSold += qty;

      const key = sale.item_name || sale.item_sku || 'Sản phẩm khác';
      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, {
          name: key,
          sku: sale.item_sku || '-',
          unit: sale.unit || 'cái',
          quantity_sold: 0,
          total_revenue: 0,
          remaining_quantity: sale.remaining_quantity
        });
      }
      const itemStat = productSalesMap.get(key);
      itemStat.quantity_sold += qty;
      itemStat.total_revenue += price;
      itemStat.remaining_quantity = sale.remaining_quantity;
    }

    const soldProducts = Array.from(productSalesMap.values());

    // Nếu ngày hôm nay chưa có đơn nhưng có ngày trước đó có đơn, lấy thông tin ngày gần nhất
    let recentSalesInfo = null;
    if (todaySales.length === 0) {
      const allValidSales = notifications.filter(n => Number(n.quantity_sold || 0) > 0 || Number(n.total_price || 0) > 0);
      if (allValidSales.length > 0) {
        const latestSale = allValidSales[0];
        const latestDate = getVietnamDateString(latestSale.sold_date || latestSale.created_at || '');
        const latestDaySales = allValidSales.filter(n => getVietnamDateString(n.sold_date || n.created_at || '') === latestDate);
        const latestRevenue = latestDaySales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
        const latestQty = latestDaySales.reduce((sum, s) => sum + Number(s.quantity_sold || 1), 0);
        recentSalesInfo = {
          latest_date: latestDate,
          total_orders: latestDaySales.length,
          total_items_sold: latestQty,
          total_revenue: latestRevenue,
          products: latestDaySales.map(s => ({
            name: s.item_name,
            quantity: s.quantity_sold,
            unit: s.unit || 'cái',
            revenue: s.total_price
          }))
        };
      }
    }

    // Lấy tình hình tồn kho thực tế hiện tại
    const files = await shopKnowledgeRepo.getFilesByShop(shop_id);
    const junkRegex = /(ghi chú|lưu ý|hướng dẫn|chú ý|tổng cộng|header|footer|note|cảnh báo|ô tồn kho)/i;
    let allCurrentItems = [];
    for (const f of files) {
      if (Array.isArray(f.inventory_data)) {
        allCurrentItems.push(...f.inventory_data.filter(i => i.name && !junkRegex.test(i.name)));
      }
    }

    const outOfStockItems = allCurrentItems.filter(i => Number(i.quantity || 0) <= 0);
    const lowStockItems = allCurrentItems.filter(i => Number(i.quantity || 0) > 0 && Number(i.quantity || 0) <= Number(i.min_threshold || 15));

    // Thống kê toàn thời gian của shop
    const allValidSales = notifications.filter(n => Number(n.quantity_sold || 0) > 0 || Number(n.total_price || 0) > 0);
    const totalAllTimeRevenue = allValidSales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);

    const todayOrders = todaySales.map((s, idx) => ({
      index: idx + 1,
      order_id: s.order_id || s.id || `DH_${idx + 1}`,
      tracking_number: s.tracking_number || '-',
      item_name: s.item_name || 'Sản phẩm',
      quantity: Number(s.quantity_sold || 1),
      unit: s.unit || 'cái',
      unit_price: Number(s.unit_price || 0),
      total_price: Number(s.total_price || 0),
      customer_name: s.customer_name || 'Khách hàng',
      customer_phone: s.customer_phone || '-',
      customer_address: s.customer_address || 'Tại shop',
      order_status: s.order_status || 'PENDING',
      time: s.created_at ? new Date(s.created_at).toLocaleTimeString('vi-VN') : ''
    }));

    const recentOrders = allValidSales.slice(0, 5).map((s, idx) => ({
      index: idx + 1,
      order_id: s.order_id || s.id || `DH_${idx + 1}`,
      tracking_number: s.tracking_number || '-',
      item_name: s.item_name || 'Sản phẩm',
      quantity: Number(s.quantity_sold || 1),
      unit: s.unit || 'cái',
      total_price: Number(s.total_price || 0),
      customer_name: s.customer_name || 'Khách hàng',
      customer_phone: s.customer_phone || '-',
      date: (s.sold_date || s.created_at || '').split('T')[0]
    }));

    return {
      shop_id,
      date: todayStr,
      total_orders: todaySales.length,
      total_items_sold: totalItemsSold,
      total_revenue: totalRevenue,
      sold_products: soldProducts,
      today_orders: todayOrders,
      recent_orders: recentOrders,
      recent_sales: recentSalesInfo,
      all_time_summary: {
        total_orders: allValidSales.length,
        total_revenue: totalAllTimeRevenue
      },
      inventory_summary: {
        total_skus: allCurrentItems.length,
        out_of_stock_count: outOfStockItems.length,
        low_stock_count: lowStockItems.length,
        out_of_stock_items: outOfStockItems.slice(0, 5),
        low_stock_items: lowStockItems.slice(0, 5)
      }
    };
  }

  /**
   * Tạo Workbook Excel (.xlsx) đa Sheet gồm:
   * Sheet 1: TonKhoThucTe (Tồn kho thời gian thực sau khi đã trừ đơn bán)
   * Sheet 2: DonHang_DaBan (Lưu chi tiết từng đơn hàng và mặt hàng đã bán)
   * Sheet 3: DoanhThu_Ngay_Va_Thang (Báo cáo tổng hợp doanh thu theo ngày & theo tháng)
   */
  async buildShopMultiSheetWorkbook(shop_id = 'default_shop') {
    const files = await shopKnowledgeRepo.getFilesByShop(shop_id);

    // Lọc danh sách tồn kho hiện tại
    const junkRegex = /(ghi chú|lưu ý|hướng dẫn|chú ý|tổng cộng|header|footer|note|cảnh báo|ô tồn kho)/i;
    let allCurrentItems = [];
    if (files && files.length > 0) {
      for (const f of files) {
        if (Array.isArray(f.inventory_data)) {
          allCurrentItems.push(...f.inventory_data.filter(i => i.name && !junkRegex.test(i.name)));
        }
      }
    }

    // -------------------------------------------------------------
    // SHEET 1: TỒN KHO THỰC TẾ (REAL-TIME INVENTORY)
    // -------------------------------------------------------------
    let inventoryRows = [];
    if (allCurrentItems.length > 0) {
      inventoryRows = allCurrentItems.map((item, index) => {
        const qty = Number(item.quantity || 0);
        const minThresh = Number(item.min_threshold || 3);
        let statusText = 'Còn hàng';
        if (qty <= 0) statusText = '🚨 ĐÃ HẾT HÀNG';
        else if (qty <= minThresh) statusText = '⚠️ Sắp hết hàng';

        return {
          'STT': index + 1,
          'Mã SKU': item.sku || '-',
          'Tên sản phẩm': item.name || '',
          'Dòng xe tương thích': item.compatible_models || 'Tất cả dòng xe',
          'Số lượng tồn kho thực tế': qty,
          'Đơn vị': item.unit || 'cái',
          'Giá bán (VNĐ)': Number(item.price || 0),
          'Vị trí lưu kho': item.location || 'Kho chính',
          'Tình trạng kho': statusText,
          'Thời gian đồng bộ': new Date().toLocaleString('vi-VN')
        };
      });
    } else {
      inventoryRows.push({
        'STT': 1,
        'Mã SKU': '-',
        'Tên sản phẩm': `Chưa nạp file danh mục kho cho shop "${shop_id}"`,
        'Dòng xe tương thích': '-',
        'Số lượng tồn kho thực tế': 0,
        'Đơn vị': '-',
        'Giá bán (VNĐ)': 0,
        'Vị trí lưu kho': '-',
        'Tình trạng kho': 'Chưa nạp dữ liệu kho',
        'Thời gian đồng bộ': new Date().toLocaleString('vi-VN')
      });
    }

    // -------------------------------------------------------------
    // SHEET 2: CHI TIẾT ĐƠN HÀNG VÀ MẶT HÀNG ĐÃ BÁN
    // -------------------------------------------------------------
    const notifications = await shopKnowledgeRepo.getNotifications(shop_id);
    const salesRecords = notifications.filter(n => Number(n.quantity_sold || 0) > 0 || Number(n.total_price || 0) > 0);

    const soldOrderRows = [];
    if (salesRecords.length === 0) {
      soldOrderRows.push({
        'STT': 1,
        'Mã Đơn Hàng': '-',
        'Mã Vận Đơn Bưu Cục': '-',
        'Thời Gian Bán': new Date().toLocaleString('vi-VN'),
        'Tên Mặt Hàng Đã Bán': 'Chưa phát sinh đơn hàng bán nào',
        'Mã SKU': '-',
        'Số Lượng Bán': 0,
        'Đơn Vị': '-',
        'Đơn Giá (VNĐ)': 0,
        'Thành Tiền (VNĐ)': 0,
        'Tên Khách Hàng': '-',
        'Số Điện Thoại': '-',
        'Địa Chỉ Giao Hàng': '-',
        'Trạng Thái Bưu Cục': '-'
      });
    } else {
      salesRecords.forEach((sale, index) => {
        const rawDate = sale.sold_date || sale.created_at || new Date().toISOString();
        const dateObj = new Date(rawDate);
        const timeFormatted = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleString('vi-VN')
          : new Date().toLocaleString('vi-VN');

        const qty = Number(sale.quantity_sold || 1);
        const unitPrice = Number(sale.unit_price || (sale.total_price ? Math.round(sale.total_price / qty) : 0));
        const totalPrice = Number(sale.total_price || (unitPrice * qty));

        let poStatus = '⏳ Chờ in vận đơn';
        if (sale.order_status === 'DELIVERED') poStatus = '✅ Giao thành công';
        else if (sale.order_status === 'SHIPPED') poStatus = '🚚 Đang giao hàng';
        else if (sale.order_status === 'PRINTED') poStatus = '📦 Đã in vận đơn';

        soldOrderRows.push({
          'STT': index + 1,
          'Mã Đơn Hàng': sale.order_id || sale.id || '-',
          'Mã Vận Đơn Bưu Cục': sale.tracking_number || '-',
          'Thời Gian Bán': timeFormatted,
          'Tên Mặt Hàng Đã Bán': sale.item_name || 'Sản phẩm',
          'Mã SKU': sale.item_sku || '-',
          'Số Lượng Bán': qty,
          'Đơn Vị': sale.unit || 'cái',
          'Đơn Giá (VNĐ)': unitPrice,
          'Thành Tiền (VNĐ)': totalPrice,
          'Tên Khách Hàng': sale.customer_name || 'Khách hàng',
          'Số Điện Thoại': sale.customer_phone || '-',
          'Địa Chỉ Giao Hàng': sale.customer_address || 'Tại shop / Chưa có địa chỉ',
          'Trạng Thái Bưu Cục': poStatus
        });
      });
    }

    // -------------------------------------------------------------
    // SHEET 3: TỔNG HỢP DOANH THU THEO NGÀY VÀ THEO THÁNG
    // -------------------------------------------------------------
    const dailyMap = new Map();
    const monthlyMap = new Map();
    let grandTotalQty = 0;
    let grandTotalRevenue = 0;

    salesRecords.forEach(sale => {
      const rawDate = sale.sold_date || sale.created_at || new Date().toISOString();
      const dateObj = new Date(rawDate);

      const dayKey = !isNaN(dateObj.getTime())
        ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
        : '17/09/2026';

      const monthKey = !isNaN(dateObj.getTime())
        ? `Tháng ${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
        : 'Tháng 09/2026';

      const qty = Number(sale.quantity_sold || 1);
      const unitPrice = Number(sale.unit_price || (sale.total_price ? sale.total_price / qty : 0));
      const total = Number(sale.total_price || (unitPrice * qty));

      grandTotalQty += qty;
      grandTotalRevenue += total;

      // Gom theo ngày
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, { date: dayKey, orderCount: 0, itemsSold: 0, revenue: 0 });
      }
      const dStat = dailyMap.get(dayKey);
      dStat.orderCount += 1;
      dStat.itemsSold += qty;
      dStat.revenue += total;

      // Gom theo tháng
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, orderCount: 0, itemsSold: 0, revenue: 0 });
      }
      const mStat = monthlyMap.get(monthKey);
      mStat.orderCount += 1;
      mStat.itemsSold += qty;
      mStat.revenue += total;
    });

    const revenueSummaryRows = [];

    // PHẦN A: BẢNG DOANH THU THEO NGÀY
    revenueSummaryRows.push({
      'Phân Loại Thống Kê': '=== BẢNG 1: TỔNG HỢP DOANH THU THEO NGÀY ===',
      'Mốc Thời Gian': '',
      'Số Đơn Hàng': '',
      'Tổng Số Lượng SP Đã Bán': '',
      'Tổng Doanh Thu (VNĐ)': '',
      'Doanh Thu TB / Đơn (VNĐ)': ''
    });

    if (dailyMap.size === 0) {
      revenueSummaryRows.push({
        'Phân Loại Thống Kê': 'Theo Ngày',
        'Mốc Thời Gian': new Date().toLocaleDateString('vi-VN'),
        'Số Đơn Hàng': 0,
        'Tổng Số Lượng SP Đã Bán': 0,
        'Tổng Doanh Thu (VNĐ)': 0,
        'Doanh Thu TB / Đơn (VNĐ)': 0
      });
    } else {
      for (const [dayKey, dStat] of dailyMap.entries()) {
        const avg = dStat.orderCount > 0 ? Math.round(dStat.revenue / dStat.orderCount) : 0;
        revenueSummaryRows.push({
          'Phân Loại Thống Kê': 'Theo Ngày',
          'Mốc Thời Gian': dayKey,
          'Số Đơn Hàng': dStat.orderCount,
          'Tổng Số Lượng SP Đã Bán': dStat.itemsSold,
          'Tổng Doanh Thu (VNĐ)': dStat.revenue,
          'Doanh Thu TB / Đơn (VNĐ)': avg
        });
      }
    }

    // Dòng ngăn cách
    revenueSummaryRows.push({
      'Phân Loại Thống Kê': '',
      'Mốc Thời Gian': '',
      'Số Đơn Hàng': '',
      'Tổng Số Lượng SP Đã Bán': '',
      'Tổng Doanh Thu (VNĐ)': '',
      'Doanh Thu TB / Đơn (VNĐ)': ''
    });

    // PHẦN B: BẢNG DOANH THU THEO THÁNG
    revenueSummaryRows.push({
      'Phân Loại Thống Kê': '=== BẢNG 2: TỔNG HỢP DOANH THU THEO THÁNG ===',
      'Mốc Thời Gian': '',
      'Số Đơn Hàng': '',
      'Tổng Số Lượng SP Đã Bán': '',
      'Tổng Doanh Thu (VNĐ)': '',
      'Doanh Thu TB / Đơn (VNĐ)': ''
    });

    if (monthlyMap.size === 0) {
      revenueSummaryRows.push({
        'Phân Loại Thống Kê': 'Theo Tháng',
        'Mốc Thời Gian': `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
        'Số Đơn Hàng': 0,
        'Tổng Số Lượng SP Đã Bán': 0,
        'Tổng Doanh Thu (VNĐ)': 0,
        'Doanh Thu TB / Đơn (VNĐ)': 0
      });
    } else {
      for (const [monthKey, mStat] of monthlyMap.entries()) {
        const avg = mStat.orderCount > 0 ? Math.round(mStat.revenue / mStat.orderCount) : 0;
        revenueSummaryRows.push({
          'Phân Loại Thống Kê': 'Theo Tháng',
          'Mốc Thời Gian': monthKey,
          'Số Đơn Hàng': mStat.orderCount,
          'Tổng Số Lượng SP Đã Bán': mStat.itemsSold,
          'Tổng Doanh Thu (VNĐ)': mStat.revenue,
          'Doanh Thu TB / Đơn (VNĐ)': avg
        });
      }
    }

    // Dòng tổng kết toàn bộ
    revenueSummaryRows.push({
      'Phân Loại Thống Kê': '',
      'Mốc Thời Gian': '',
      'Số Đơn Hàng': '',
      'Tổng Số Lượng SP Đã Bán': '',
      'Tổng Doanh Thu (VNĐ)': '',
      'Doanh Thu TB / Đơn (VNĐ)': ''
    });
    const grandAvg = salesRecords.length > 0 ? Math.round(grandTotalRevenue / salesRecords.length) : 0;
    revenueSummaryRows.push({
      'Phân Loại Thống Kê': '🌟 TỔNG DOANH THU TOÀN BỘ CỬA HÀNG',
      'Mốc Thời Gian': 'Toàn thời gian',
      'Số Đơn Hàng': salesRecords.length,
      'Tổng Số Lượng SP Đã Bán': grandTotalQty,
      'Tổng Doanh Thu (VNĐ)': grandTotalRevenue,
      'Doanh Thu TB / Đơn (VNĐ)': grandAvg
    });

    // -------------------------------------------------------------
    // KHỞI TẠO WORKBOOK 3 SHEET
    // -------------------------------------------------------------
    const wb = XLSX.utils.book_new();

    // Sheet 1: TonKhoThucTe
    const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
    XLSX.utils.book_append_sheet(wb, wsInventory, 'TonKhoThucTe');

    // Sheet 2: DonHang_DaBan
    const wsOrders = XLSX.utils.json_to_sheet(soldOrderRows);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'DonHang_DaBan');

    // Sheet 3: DoanhThu_Ngay_Va_Thang
    const wsRevenue = XLSX.utils.json_to_sheet(revenueSummaryRows);
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'DoanhThu_Ngay_Va_Thang');

    return {
      wb,
      inventoryRows,
      soldOrderRows,
      revenueSummaryRows,
      total_items: allCurrentItems.length,
      total_orders: salesRecords.length,
      total_items_sold: grandTotalQty,
      total_revenue: grandTotalRevenue,
      sheet_names: ['TonKhoThucTe', 'DonHang_DaBan', 'DoanhThu_Ngay_Va_Thang']
    };
  }

  /**
   * Xuất file Trang Tính Excel (.xlsx) gồm 3 Sheet:
   * Sheet 1: TonKhoThucTe (Tồn kho thời gian thực)
   * Sheet 2: DonHang_DaBan (Chi tiết mặt hàng & đơn hàng đã bán)
   * Sheet 3: DoanhThu_Ngay_Va_Thang (Báo cáo doanh thu theo ngày & theo tháng)
   */
  async exportUpdatedInventoryExcel(shop_id = 'default_shop') {
    const { wb, total_items, total_revenue, total_items_sold, sheet_names } = await this.buildShopMultiSheetWorkbook(shop_id);

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `kho_va_doanh_thu_${shop_id}_${Date.now()}.xlsx`;
    const storagePath = `${shop_id}/${fileName}`;
    let downloadUrl = `https://blrimwahpwfqewfmmtet.supabase.co/storage/v1/object/public/kho/${storagePath}`;

    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('kho')
          .upload(storagePath, excelBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('kho').getPublicUrl(storagePath);
          downloadUrl = urlData?.publicUrl || downloadUrl;
        }
      } catch (err) {
        console.warn('[Supabase Storage] Lỗi lưu báo cáo Excel:', err.message);
      }
    }

    return {
      success: true,
      shop_id,
      file_name: fileName,
      download_url: downloadUrl,
      base64: excelBuffer.toString('base64'),
      sheet_names,
      total_items,
      total_revenue,
      total_items_sold,
      buffer: excelBuffer
    };
  }

  /**
   * Tự động cập nhật file Excel của CHÍNH SHOP ĐÓ khi có phát sinh đơn hàng bán
   * Biên soạn lại Workbook 3 Sheet -> Lưu đè lên Supabase Cloud Storage -> Cập nhật DB
   */
  async syncAndSaveShopExcelFile(shop_id = 'default_shop') {
    try {
      const { wb, total_items, total_revenue, total_items_sold, sheet_names } = await this.buildShopMultiSheetWorkbook(shop_id);
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const base64Str = excelBuffer.toString('base64');

      const fileName = `kho_va_doanh_thu_${shop_id}.xlsx`;
      const storagePath = `${shop_id}/${fileName}`;
      let cloudFileUrl = `https://blrimwahpwfqewfmmtet.supabase.co/storage/v1/object/public/kho/${storagePath}`;

      if (supabase) {
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('kho')
            .upload(storagePath, excelBuffer, {
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('kho').getPublicUrl(storagePath);
            cloudFileUrl = urlData?.publicUrl || cloudFileUrl;
          }
        } catch (e) {
          console.warn('[SyncShopExcel] Lỗi upload Supabase Storage:', e.message);
        }
      }

      // Cập nhật đường dẫn file_path mới nhất và base64 vào bản ghi của shop trong DB & memory
      const files = await shopKnowledgeRepo.getFilesByShop(shop_id);
      if (files && files.length > 0) {
        const targetFile = files[0];
        const updatedRecord = {
          ...targetFile,
          file_path: cloudFileUrl,
          last_excel_base64: base64Str,
          sheet_names,
          updated_at: new Date().toISOString()
        };

        shopKnowledgeRepo.memoryFiles.set(targetFile.id, updatedRecord);

        if (supabase) {
          try {
            await supabase
              .from('shop_knowledge_files')
              .update({
                file_path: cloudFileUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', targetFile.id);
          } catch (e) {}
        }
      }

      return {
        success: true,
        shop_id,
        file_name: fileName,
        cloud_file_url: cloudFileUrl,
        sheet_names,
        total_items,
        total_revenue,
        total_items_sold
      };
    } catch (err) {
      console.warn(`[SyncShopExcel] Cảnh báo khi tự động đồng bộ file Excel cho shop "${shop_id}":`, err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ShopReportService();
