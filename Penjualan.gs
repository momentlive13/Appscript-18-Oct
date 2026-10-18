/**
 * ==========================================================
 * Penjualan.gs - CRUD order, kalkulasi otomatis, validasi status
 * ==========================================================
 */

// ---------- KALKULASI ----------

function calculateOrderTotals_(f) {
  // --- PERHITUNGAN LAYANAN 1 ---
  const qty1 = Number(f['QTY 1']) || 0;
  const hargaJual1 = Number(f['HARGA JUAL 1']) || Number(f['NOMINAL (Rp) 1']) || 0;
  const hargaPokok1 = Number(f['HARGA POKOK 1']) || 0;
  
  // Nominal dicatat sebagai Harga Satuan (Harga Jual)
  const nominal1 = hargaJual1; 
  
  // Subtotal adalah Harga Satuan x Qty
  const subtotal1 = nominal1 * qty1;
  
  const diskonPersen1 = Number(f['DISKON % 1']) || 0;
  const diskonRp1 = diskonPersen1 > 0 ? subtotal1 * (diskonPersen1 / 100) : (Number(f['DISKON (Rp) 1']) || 0);
  
  const total1 = subtotal1 - diskonRp1;
  
  // Margin dihitung dari Total dikurangi Total Harga Pokok (Harga Pokok x Qty)
  const marginRp1 = total1 - (hargaPokok1 * qty1);
  const marginPersen1 = total1 > 0 ? marginRp1 / total1 : 0;

  // --- PERHITUNGAN LAYANAN 2 ---
  const qty2 = Number(f['QTY 2']) || 0;
  const hargaJual2 = Number(f['HARGA JUAL 2']) || Number(f['NOMINAL (Rp) 2']) || 0;
  const hargaPokok2 = Number(f['HARGA POKOK 2']) || 0;
  
  const nominal2 = hargaJual2;
  
  const subtotal2 = nominal2 * qty2;
  
  const diskonPersen2 = Number(f['DISKON % 2']) || 0;
  const diskonRp2 = diskonPersen2 > 0 ? subtotal2 * (diskonPersen2 / 100) : (Number(f['DISKON (Rp) 2']) || 0);
  
  const total2 = nominal2 > 0 ? subtotal2 - diskonRp2 : 0;
  
  const marginRp2 = nominal2 > 0 ? total2 - (hargaPokok2 * qty2) : 0;
  const marginPersen2 = total2 > 0 ? marginRp2 / total2 : 0;

  // --- TOTAL KESELURUHAN ---
  const grandTotal = total1 + total2;
  const dp = Number(f['DOWN PAYMENT']) || 0;
  const pelunasan = Number(f['NOMINAL PELUNASAN']) || 0;
  const sisaPelunasan = grandTotal - dp - pelunasan;

  return {
    'NOMINAL (Rp) 1': nominal1,
    'DISKON (Rp) 1': diskonRp1,
    'TOTAL 1': total1,
    'MARGIN (Rp) 1': marginRp1,
    'MARGIN % 1': marginPersen1,
    'NOMINAL (Rp) 2': nominal2,
    'DISKON (Rp) 2': diskonRp2,
    'TOTAL 2': total2,
    'MARGIN (Rp) 2': marginRp2,
    'MARGIN % 2': marginPersen2,
    'GRAND TOTAL': grandTotal,
    'SISA PELUNASAN': sisaPelunasan,
  };
}

// ---------- VALIDASI TRANSISI STATUS ----------
// Semua transisi bebas syarat, KECUALI Selesai (wajib lunas dulu).
// Field2 detail (paket, DP, pelunasan) diisi belakangan setelah status berubah,
// bukan syarat sebelum pindah status.

function validateStatusTransition_(currentStatus, nextStatus, merged) {
  if (nextStatus === CONFIG.STATUS_BATAL) {
    return; // Batal boleh dari status manapun, tanpa syarat
  }

  const urutan = CONFIG.STATUS_URUTAN;
  const curIdx = urutan.indexOf(currentStatus);
  const nextIdx = urutan.indexOf(nextStatus);

  if (nextIdx === -1) throw new Error('Status "' + nextStatus + '" tidak dikenali.');
  if (nextIdx !== curIdx + 1) {
    throw new Error('Status harus urut. Tidak bisa loncat dari "' + currentStatus + '" ke "' + nextStatus + '".');
  }

  if (nextStatus === 'Selesai') {
    if (Number(merged['SISA PELUNASAN']) > 0) {
      throw new Error('Sisa Pelunasan masih Rp' + Number(merged['SISA PELUNASAN']).toLocaleString('id-ID') + '. Harus lunas dulu sebelum ubah ke Selesai.');
    }
  }
}

// ---------- CARD LIST (per tab status, dengan sorting) ----------

function getOrdersByStatus(status) {
  requireRole_(['Owner', 'Admin']);
  const all = readSheetAsObjects_(CONFIG.SHEET_PENJUALAN);
  let filtered = all.filter(function (o) { return o['STATUS'] === status; });

  if (status === 'Penawaran') {
    // Terbaru di atas, berdasarkan TANGGAL (input)
    filtered.sort(function (a, b) { return new Date(b['TANGGAL']) - new Date(a['TANGGAL']); });
  } else if (status === 'Selesai') {
    // Acara yang paling baru selesai di atas (Tanggal Acara terbaru di atas)
    filtered.sort(function (a, b) { return new Date(b['TANGGAL ACARA']) - new Date(a['TANGGAL ACARA']); });
  } else {
    // Deal, Lunas -> Tanggal Acara terdekat (akan datang) di atas
    filtered.sort(function (a, b) { return new Date(a['TANGGAL ACARA']) - new Date(b['TANGGAL ACARA']); });
  }

  const mapped = filtered.map(function (o) {
    return {
      row: o._row,
      idOrder: o['ID. ORDER'],
      customer: o['CUSTOMER'],
      tanggalAcara: formatDateOnly_(o['TANGGAL ACARA']),
      status: o['STATUS'],
      statusDesain: o['STATUS DESAIN'] || 'Belum',
      linkYoutube: o['LINK YOUTUBE'] || '',
      showPdfButton: status !== 'Penawaran',
    };
  });
  return JSON.stringify(mapped);
}

// ---------- AMBIL SEMUA DATA SEKALIGUS (dipakai load awal + background poll) ----------
// Client yang nanti filter/sort per status, biar navigasi/detail nggak perlu server call lagi.

function getAllOrders() {
  requireRole_(['Owner', 'Admin']);
  const all = readSheetAsObjects_(CONFIG.SHEET_PENJUALAN);
  const cleaned = all.map(function (o) {
    const copy = Object.assign({}, o);
    delete copy._row;
    if (copy['TANGGAL']) copy['TANGGAL'] = formatDateOnly_(copy['TANGGAL']);
    if (copy['TANGGAL ACARA']) copy['TANGGAL ACARA'] = formatDateOnly_(copy['TANGGAL ACARA']);
    if (copy['TANGGAL DP']) copy['TANGGAL DP'] = formatDateOnly_(copy['TANGGAL DP']);
    if (copy['TANGGAL PELUNASAN']) copy['TANGGAL PELUNASAN'] = formatDateOnly_(copy['TANGGAL PELUNASAN']);
    return copy;
  });
  return JSON.stringify(cleaned);
}

// ---------- DETAIL ----------

function getOrderDetail(idOrder) {
  requireRole_(['Owner', 'Admin']);
  const all = readSheetAsObjects_(CONFIG.SHEET_PENJUALAN);
  const found = all.find(function (o) { return o['ID. ORDER'] === idOrder; });
  if (!found) throw new Error('Order tidak ditemukan.');
  const copy = Object.assign({}, found);
  delete copy._row;
  if (copy['TANGGAL']) copy['TANGGAL'] = formatDateOnly_(copy['TANGGAL']);
  if (copy['TANGGAL ACARA']) copy['TANGGAL ACARA'] = formatDateOnly_(copy['TANGGAL ACARA']);
  if (copy['TANGGAL DP']) copy['TANGGAL DP'] = formatDateOnly_(copy['TANGGAL DP']);
  if (copy['TANGGAL PELUNASAN']) copy['TANGGAL PELUNASAN'] = formatDateOnly_(copy['TANGGAL PELUNASAN']);
  return JSON.stringify(copy);
}

// ---------- CREATE (status Penawaran) ----------
// Cuma Customer + Link Instagram. Tanggal Acara diisi belakangan di detail.

function createOrder(data) {
  const user = requireRole_(['Owner', 'Admin']);

  if (!data.customer) throw new Error('Nama Customer wajib diisi.');

  const idOrder = generateIdOrder_();
  const row = {
    'ID. ORDER': idOrder,
    'TANGGAL': new Date(),
    'CUSTOMER': data.customer,
    'LINK INSTAGRAM': data.linkInstagram || '',
    'STATUS': 'Penawaran',
    'Inputed by': user.nama,
  };
  appendPenjualanRow_(row);
  touchDataVersion_('orders');
  return idOrder;
}

// ---------- UPDATE + GANTI STATUS ----------

function updateOrder(idOrder, newFields, newStatus) {
  requireRole_(['Owner', 'Admin']);

  const all = readSheetAsObjects_(CONFIG.SHEET_PENJUALAN);
  const current = all.find(function (o) { return o['ID. ORDER'] === idOrder; });
  if (!current) throw new Error('Order tidak ditemukan.');

  const merged = Object.assign({}, current, newFields);

  const computed = calculateOrderTotals_(merged);
  Object.assign(merged, computed);

  const targetStatus = newStatus || current['STATUS'];
  if (targetStatus !== current['STATUS']) {
    validateStatusTransition_(current['STATUS'], targetStatus, merged);
    merged['STATUS'] = targetStatus;
  }

  const toWrite = Object.assign({}, newFields, computed, { STATUS: merged['STATUS'] });
  setRowByHeaders_(CONFIG.SHEET_PENJUALAN, current._row, toWrite);
  touchDataVersion_('orders');

  return { success: true, status: merged['STATUS'] };
}