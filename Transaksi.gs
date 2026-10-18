/**
 * ==========================================================
 * Transaksi.gs - Rekap Transaksi (jurnal double-entry manual)
 * ==========================================================
 * Independen dari Penjualan (sesuai kesepakatan) - semua entri manual,
 * admin sendiri yang tentukan Akun Debit & Akun Kredit tiap transaksi.
 */

function getTransaksiList() {
  requireRole_(['Owner', 'Admin']);
  const list = readSheetAsObjects_(CONFIG.SHEET_TRANSAKSI);
  return list.map(function (t) {
    return {
      row: t._row,
      no: t['NO.'],
      tanggal: formatDateOnly_(t['TANGGAL']),
      deskripsi: t['DESKRIPSI'],
      akunDebit: t['AKUN DEBIT'],
      akunKredit: t['AKUN KREDIT'],
      nominal: Number(t['NOMINAL']) || 0,
      keterangan: t['KETERANGAN'] || '',
      nomorId: t['NOMOR ID'],
      bulan: t['BULAN'],
    };
  });
}

function hitungNoUrutBulan_(tanggal) {
  const sheet = getSheet_(CONFIG.SHEET_TRANSAKSI);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  const target = new Date(tanggal);
  const targetBulan = target.getMonth();
  const targetTahun = target.getFullYear();

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues(); // NO. + TANGGAL
  let count = 0;
  data.forEach(function (row) {
    const tgl = row[1];
    if (tgl instanceof Date && tgl.getMonth() === targetBulan && tgl.getFullYear() === targetTahun) {
      count++;
    }
  });
  return count + 1;
}

function formatBulanTahun_(tanggal) {
  const date = new Date(tanggal);
  return Utilities.formatDate(date, 'Asia/Jakarta', 'MM/yyyy');
}

function createTransaksi(data) {
  const user = requireRole_(['Owner', 'Admin']);
  if (!data.tanggal) throw new Error('Tanggal wajib diisi.');
  if (!data.deskripsi) throw new Error('Deskripsi wajib diisi.');
  if (!data.akunDebit) throw new Error('Akun Debit wajib dipilih.');
  if (!data.akunKredit) throw new Error('Akun Kredit wajib dipilih.');
  if (!data.nominal) throw new Error('Nominal wajib diisi.');
  if (data.akunDebit === data.akunKredit) throw new Error('Akun Debit dan Akun Kredit tidak boleh sama.');

  const tanggalDate = new Date(data.tanggal);
  const noUrut = hitungNoUrutBulan_(tanggalDate);
  const targetRow = appendRowSafely_(CONFIG.SHEET_TRANSAKSI, {
    'NO.': noUrut,
    'TANGGAL': tanggalDate,
    'DESKRIPSI': data.deskripsi,
    'AKUN DEBIT': data.akunDebit,
    'AKUN KREDIT': data.akunKredit,
    'NOMINAL': Number(data.nominal),
    'KETERANGAN': data.keterangan || '',
    'NOMOR ID': generateUniqueId8_(),
    'BULAN': formatBulanTahun_(tanggalDate),
  }, 'NOMOR ID');
  touchDataVersion_('transaksi');
  return { row: targetRow, no: noUrut };
}

function updateTransaksi(row, data) {
  requireRole_(['Owner', 'Admin']);
  if (!data.tanggal) throw new Error('Tanggal wajib diisi.');
  if (!data.deskripsi) throw new Error('Deskripsi wajib diisi.');
  if (!data.akunDebit) throw new Error('Akun Debit wajib dipilih.');
  if (!data.akunKredit) throw new Error('Akun Kredit wajib dipilih.');
  if (!data.nominal) throw new Error('Nominal wajib diisi.');
  if (data.akunDebit === data.akunKredit) throw new Error('Akun Debit dan Akun Kredit tidak boleh sama.');

  const tanggalDate = new Date(data.tanggal);
  setRowByHeaders_(CONFIG.SHEET_TRANSAKSI, row, {
    'TANGGAL': tanggalDate,
    'DESKRIPSI': data.deskripsi,
    'AKUN DEBIT': data.akunDebit,
    'AKUN KREDIT': data.akunKredit,
    'NOMINAL': Number(data.nominal),
    'KETERANGAN': data.keterangan || '',
    'BULAN': formatBulanTahun_(tanggalDate),
  });
  touchDataVersion_('transaksi');
  return true;
}

function deleteTransaksi(row) {
  requireRole_(['Owner', 'Admin']);
  deleteRowByIndex_(CONFIG.SHEET_TRANSAKSI, row);
  touchDataVersion_('transaksi');
  return true;
}