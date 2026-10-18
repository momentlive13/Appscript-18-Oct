/**
 * ==========================================================
 * DaftarAkun.gs - Master Chart of Accounts (buat modul Transaksi nanti)
 * Cuma data master (Kode, Nama, Kategori) - SALDO dihitung live nanti
 * begitu modul Transaksi/Rekap dibangun, bukan disimpan statis di sini.
 * ==========================================================
 */

const KATEGORI_AKUN = ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban'];

function getAkunList() {
  requireRole_(['Owner', 'Admin']);
  const list = readSheetAsObjects_(CONFIG.SHEET_DAFTAR_AKUN);
  return list.map(function (a) {
    return { row: a._row, kode: a['KODE AKUN'], nama: a['NAMA AKUN'], kategori: a['KATEGORI'] };
  });
}

function createAkun(data) {
  requireRole_(['Owner', 'Admin']);
  if (!data.kode) throw new Error('Kode Akun wajib diisi.');
  if (!data.nama) throw new Error('Nama Akun wajib diisi.');
  if (!data.kategori) throw new Error('Kategori wajib dipilih.');
  appendRowByHeaders_(CONFIG.SHEET_DAFTAR_AKUN, {
    'KODE AKUN': Number(data.kode), 'NAMA AKUN': data.nama, 'KATEGORI': data.kategori,
  });
  touchDataVersion_('akun');
  return true;
}

function updateAkun(row, data) {
  requireRole_(['Owner', 'Admin']);
  setRowByHeaders_(CONFIG.SHEET_DAFTAR_AKUN, row, {
    'KODE AKUN': Number(data.kode), 'NAMA AKUN': data.nama, 'KATEGORI': data.kategori,
  });
  touchDataVersion_('akun');
  return true;
}

function deleteAkun(row) {
  requireRole_(['Owner', 'Admin']);
  deleteRowByIndex_(CONFIG.SHEET_DAFTAR_AKUN, row);
  touchDataVersion_('akun');
  return true;
}