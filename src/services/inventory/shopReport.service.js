const XLSX = require('xlsx');
const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');
const { supabase } = require('../../config/supabase');

class ShopReportService {
  /**
   * Tạo báo cáo tổng hợp bán hàng & doanh thu trong ngày của Shop
   */
  async generateDailySalesReport(shop_id = 'default_shop', targetDate = null) {
    const todayStr = targetDate || new Date().toISOString().split('T')[0];
    const notifications = await shopKnowledgeRepo.getNotifications(shop_id);

    // Lọc các thông báo phát sinh giao dịch trong ngày
    const todaySales = notifications.filter(n => {
      const notiDate = (n.sold_date || n.created_at || '').split('T')[0];
      return notiDate === todayStr && (n.quantity_sold > 0 || n.total_price > 0);
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

    // Lấy tình hình tồn kho thực tế hiện tại
    const files = await shopKnowledgeRepo.getFilesByShop(shop_id);
    let allCurrentItems = [];
    for (const f of files) {
      if (Array.isArray(f.inventory_data)) {
        allCurrentItems.push(...f.inventory_data);
      }
    }

    const outOfStockItems = allCurrentItems.filter(i => Number(i.quantity || 0) <= 0);
    const lowStockItems = allCurrentItems.filter(i => Number(i.quantity || 0) > 0 && Number(i.quantity || 0) <= Number(i.min_threshold || 3));

    return {
      shop_id,
      date: todayStr,
      total_orders: todaySales.length,
      total_items_sold: totalItemsSold,
      total_revenue: totalRevenue,
      sold_products: soldProducts,
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
   * Xuất file Trang Tính Excel (.xlsx) gồm 2 Sheet:
   * Sheet 1: TonKhoThucTe (Tồn kho thời gian thực)
   * Sheet 2: DoanhThu_ChiTiet (Báo cáo doanh thu & chi tiết bán hàng theo ngày chuẩn mẫu Ảnh 4)
   */
  async exportUpdatedInventoryExcel(shop_id = 'default_shop') {
    const files = await shopKnowledgeRepo.getFilesByShop(shop_id);
    if (!files || files.length === 0) {
      throw new Error(`Shop "${shop_id}" chưa có dữ liệu kho nào để xuất.`);
    }

    let allCurrentItems = [];
    for (const f of files) {
      if (Array.isArray(f.inventory_data)) {
        allCurrentItems.push(...f.inventory_data);
      }
    }

    // -------------------------------------------------------------
    // SHEET 1: TỒN KHO THỰC TẾ (REAL-TIME INVENTORY)
    // -------------------------------------------------------------
    const inventoryRows = allCurrentItems.map((item, index) => {
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

    // -------------------------------------------------------------
    // SHEET 2: DOANH THU & CHI TIẾT BÁN HÀNG THEO NGÀY (MẪU ẢNH 4)
    // -------------------------------------------------------------
    const notifications = await shopKnowledgeRepo.getNotifications(shop_id);
    const salesRecords = notifications.filter(n => Number(n.quantity_sold || 0) > 0 || Number(n.total_price || 0) > 0);

    // Nhóm giao dịch theo ngày
    const salesByDate = new Map();
    salesRecords.forEach(sale => {
      const rawDate = sale.sold_date || sale.created_at || new Date().toISOString();
      const dateObj = new Date(rawDate);
      const dStr = !isNaN(dateObj.getTime()) 
        ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
        : 'Hôm nay';

      if (!salesByDate.has(dStr)) {
        salesByDate.set(dStr, []);
      }
      salesByDate.get(dStr).push(sale);
    });

    const revenueRows = [];
    let grandTotalQty = 0;
    let grandTotalRevenue = 0;

    if (salesByDate.size === 0) {
      revenueRows.push({
        'Ngày': new Date().toLocaleDateString('vi-VN'),
        'Mã SP': '-',
        'Tên sản phẩm': 'Chưa phát sinh giao dịch bán hàng nào',
        'Số lượng bán': 0,
        'Đơn giá bán (VNĐ)': 0,
        'Thành tiền (VNĐ)': 0,
        'TB doanh thu/SP trong ngày (VNĐ)': 0
      });
    } else {
      for (const [dateStr, items] of salesByDate.entries()) {
        let dayQty = 0;
        let dayRevenue = 0;

        // Dòng chi tiết từng sản phẩm bán trong ngày
        for (const it of items) {
          const qty = Number(it.quantity_sold || 1);
          const unitPrice = Number(it.unit_price || (it.total_price ? it.total_price / qty : 0));
          const total = Number(it.total_price || (unitPrice * qty));

          dayQty += qty;
          dayRevenue += total;

          revenueRows.push({
            'Ngày': dateStr,
            'Mã SP': it.item_sku || '-',
            'Tên sản phẩm': it.item_name || 'Sản phẩm',
            'Số lượng bán': qty,
            'Đơn giá bán (VNĐ)': unitPrice,
            'Thành tiền (VNĐ)': total,
            'TB doanh thu/SP trong ngày (VNĐ)': ''
          });
        }

        grandTotalQty += dayQty;
        grandTotalRevenue += dayRevenue;

        // Dòng Tổng Cộng Theo Ngày (Subtotal row)
        const dayAvg = dayQty > 0 ? Math.round(dayRevenue / dayQty) : 0;
        revenueRows.push({
          'Ngày': `==> Tổng ngày ${dateStr} — ${items.length} sản phẩm bán`,
          'Mã SP': '',
          'Tên sản phẩm': '',
          'Số lượng bán': dayQty,
          'Đơn giá bán (VNĐ)': '',
          'Thành tiền (VNĐ)': dayRevenue,
          'TB doanh thu/SP trong ngày (VNĐ)': dayAvg
        });
      }

      // Dòng Tổng Cộng Tất Cả Các Ngày (Grand Total)
      const grandAvg = grandTotalQty > 0 ? Math.round(grandTotalRevenue / grandTotalQty) : 0;
      revenueRows.push({
        'Ngày': '🌟 TỔNG CỘNG TẤT CẢ CÁC NGÀY',
        'Mã SP': '',
        'Tên sản phẩm': '',
        'Số lượng bán': grandTotalQty,
        'Đơn giá bán (VNĐ)': '',
        'Thành tiền (VNĐ)': grandTotalRevenue,
        'TB doanh thu/SP trong ngày (VNĐ)': grandAvg
      });
    }

    // Tạo Workbook 2 Sheet
    const wb = XLSX.utils.book_new();
    
    // Sheet 1
    const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
    XLSX.utils.book_append_sheet(wb, wsInventory, 'TonKhoThucTe');

    // Sheet 2
    const wsRevenue = XLSX.utils.json_to_sheet(revenueRows);
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'DoanhThu_ChiTiet');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `trang_tinh_kho_doanh_thu_${shop_id}_${Date.now()}.xlsx`;
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
      sheet_names: ['TonKhoThucTe', 'DoanhThu_ChiTiet'],
      total_items: allCurrentItems.length,
      total_revenue: grandTotalRevenue,
      total_items_sold: grandTotalQty,
      buffer: excelBuffer
    };
  }
}

module.exports = new ShopReportService();
