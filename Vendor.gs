/**
 * ==========================================================
 * Vendor.gs - Daftar Vendor (dropdown Penjualan + CRUD)
 * ==========================================================
 */

function getVendorList() {
  requireRole_(['Owner', 'Admin']);
  const list = readSheetAsObjects_(CONFIG.SHEET_VENDOR);
  return list.map(function (v) {
    return { row: v._row, nama: v['NAMA VENDOR'], email: v['EMAIL'] || '', keteranganHarga: v['KETERANGAN HARGA'] || '' };
  }).filter(function (v) { return v.nama; });
}

function createVendor(data) {
  requireRole_(['Owner', 'Admin']);
  if (!data.nama) throw new Error('Nama Vendor wajib diisi.');
  appendRowByHeaders_(CONFIG.SHEET_VENDOR, {
    'NAMA VENDOR': data.nama, 'EMAIL': data.email || '', 'KETERANGAN HARGA': data.keteranganHarga || '',
  });
  touchDataVersion_('vendor');
  return true;
}

function updateVendor(row, data) {
  requireRole_(['Owner', 'Admin']);
  setRowByHeaders_(CONFIG.SHEET_VENDOR, row, {
    'NAMA VENDOR': data.nama, 'EMAIL': data.email || '', 'KETERANGAN HARGA': data.keteranganHarga || '',
  });
  touchDataVersion_('vendor');
  return true;
}

function deleteVendor(row) {
  requireRole_(['Owner', 'Admin']);
  deleteRowByIndex_(CONFIG.SHEET_VENDOR, row);
  touchDataVersion_('vendor');
  return true;
}