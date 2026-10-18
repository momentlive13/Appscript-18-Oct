/**
 * ==========================================================
 * Layanan.gs - Referensi paket layanan (dulu sheet MOMENT LIVE)
 * ==========================================================
 */

function getLayananList() {
  requireRole_(['Owner', 'Admin']);
  const list = readSheetAsObjects_(CONFIG.SHEET_LAYANAN);
  return list.map(function (l) {
    const hargaPokok = Number(l['HARGA POKOK']) || 0;
    const hargaJual = Number(l['HARGA JUAL']) || 0;
    const marginPersen = hargaJual > 0 ? ((hargaJual - hargaPokok) / hargaJual) * 100 : 0;
    return {
      row: l._row,
      deskripsi: l['DESKRIPSI LAYANAN'],
      rincian: l['RINCIAN LAYANAN'],
      hargaPokok: hargaPokok,
      hargaJual: hargaJual,
      marginPersen: marginPersen,
    };
  });
}

function createLayanan(data) {
  requireRole_(['Owner', 'Admin']);
  if (!data.deskripsi) throw new Error('Deskripsi Layanan wajib diisi.');
  const hargaPokok = Number(data.hargaPokok) || 0;
  const hargaJual = Number(data.hargaJual) || 0;
  const marginPersen = hargaJual > 0 ? ((hargaJual - hargaPokok) / hargaJual) * 100 : 0;
  appendRowByHeaders_(CONFIG.SHEET_LAYANAN, {
    'DESKRIPSI LAYANAN': data.deskripsi,
    'RINCIAN LAYANAN': data.rincian || '',
    'HARGA POKOK': hargaPokok,
    'HARGA JUAL': hargaJual,
    'MARGIN': marginPersen,
  });
  touchDataVersion_('layanan');
  return true;
}

function updateLayanan(row, data) {
  requireRole_(['Owner', 'Admin']);
  const hargaPokok = Number(data.hargaPokok) || 0;
  const hargaJual = Number(data.hargaJual) || 0;
  const marginPersen = hargaJual > 0 ? ((hargaJual - hargaPokok) / hargaJual) * 100 : 0;
  setRowByHeaders_(CONFIG.SHEET_LAYANAN, row, {
    'DESKRIPSI LAYANAN': data.deskripsi,
    'RINCIAN LAYANAN': data.rincian || '',
    'HARGA POKOK': hargaPokok,
    'HARGA JUAL': hargaJual,
    'MARGIN': marginPersen,
  });
  touchDataVersion_('layanan');
  return true;
}