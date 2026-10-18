/**
 * ==========================================================
 * Nota.gs - Generate PDF nota dari template Google Doc
 * ==========================================================
 *
 * FLOW (sesuai appsheet):
 * - Kalau nota BELUM pernah dibuat -> tombol "Buat Nota" -> generate baru
 * - Kalau nota SUDAH ada -> tombol "Lihat Nota" (buka PDF lama, TIDAK generate ulang)
 *   + tombol kecil terpisah "Generate Ulang" -> generate PDF baru (data terbaru),
 *     PDF lama TETAP ada di Drive (tidak overwrite, tidak dihapus), cuma
 *     link "PDF terbaru" di sistem berubah nunjuk ke yang baru.
 */

function getOrCreateNotaFolder_() {
  return DriveApp.getFolderById(CONFIG.NOTA_FOLDER_ID);
}

function escapeRegex_(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replacePlaceholder_(body, key, value) {
  body.replaceText(escapeRegex_('<<[' + key + ']>>'), value == null ? '' : String(value));
}

function generateNota(idOrder) {
  requireRole_(['Owner', 'Admin']);

  if (!CONFIG.NOTA_TEMPLATE_DOC_ID || CONFIG.NOTA_TEMPLATE_DOC_ID.indexOf('ISI_') === 0) {
    throw new Error('Template Nota belum di-setting. Isi CONFIG.NOTA_TEMPLATE_DOC_ID di Code.gs dulu.');
  }

  const all = readSheetAsObjects_(CONFIG.SHEET_PENJUALAN);
  const o = all.find(function (r) { return r['ID. ORDER'] === idOrder; });
  if (!o) throw new Error('Order tidak ditemukan.');

  const uniqueId = generateUniqueId8_();
  const folder = getOrCreateNotaFolder_();

  // 1. Copy template Doc
  const templateFile = DriveApp.getFileById(CONFIG.NOTA_TEMPLATE_DOC_ID);
  const copyFile = templateFile.makeCopy('TEMP_NOTA_' + idOrder, folder);
  const doc = DocumentApp.openById(copyFile.getId());
  const body = doc.getBody();

  // 2. Isi semua placeholder teks
  replacePlaceholder_(body, 'ID. ORDER', o['ID. ORDER']);
  
  // ---> DI SINI KITA PAKAI FORMAT WAKTU (DATETIME) KHUSUS TANGGAL NOTA <---
  replacePlaceholder_(body, 'TANGGAL UPDATE', formatTanggalWaktuIndo_(new Date()));
  
  replacePlaceholder_(body, 'TANGGAL ACARA', formatTanggalIndo_(o['TANGGAL ACARA']));
  replacePlaceholder_(body, 'CUSTOMER', o['CUSTOMER']);

  replacePlaceholder_(body, 'DESKRIPSI LAYANAN 1', o['DESKRIPSI LAYANAN 1']);
  replacePlaceholder_(body, 'RINCIAN LAYANAN 1', o['RINCIAN LAYANAN 1']);
  replacePlaceholder_(body, 'QTY 1', o['QTY 1']);
  replacePlaceholder_(body, 'NOMINAL (Rp) 1', formatRupiah(o['NOMINAL (Rp) 1']));
  replacePlaceholder_(body, 'DISKON % 1', o['DISKON % 1']);
  replacePlaceholder_(body, 'DISKON (Rp) 1', formatRupiah(o['DISKON (Rp) 1']));
  replacePlaceholder_(body, 'TOTAL 1', formatRupiah(o['TOTAL 1']));

  const adaLayanan2 = !!o['DESKRIPSI LAYANAN 2'];
  replacePlaceholder_(body, 'DESKRIPSI LAYANAN 2', adaLayanan2 ? o['DESKRIPSI LAYANAN 2'] : '-');
  replacePlaceholder_(body, 'RINCIAN LAYANAN 2', adaLayanan2 ? o['RINCIAN LAYANAN 2'] : '-');
  replacePlaceholder_(body, 'QTY 2', adaLayanan2 ? o['QTY 2'] : '-');
  replacePlaceholder_(body, 'NOMINAL (Rp) 2', adaLayanan2 ? formatRupiah(o['NOMINAL (Rp) 2']) : '-');
  replacePlaceholder_(body, 'DISKON % 2', adaLayanan2 ? o['DISKON % 2'] : '-');
  replacePlaceholder_(body, 'DISKON (Rp) 2', adaLayanan2 ? formatRupiah(o['DISKON (Rp) 2']) : '-');
  replacePlaceholder_(body, 'TOTAL 2', adaLayanan2 ? formatRupiah(o['TOTAL 2']) : '-');

  replacePlaceholder_(body, 'GRAND TOTAL', formatRupiah(o['GRAND TOTAL']));
  replacePlaceholder_(body, 'DOWN PAYMENT', formatRupiah(o['DOWN PAYMENT']));
  replacePlaceholder_(body, 'TANGGAL DP', formatTanggalIndo_(o['TANGGAL DP']));
  replacePlaceholder_(body, 'NOMINAL PELUNASAN', formatRupiah(o['NOMINAL PELUNASAN']));
  replacePlaceholder_(body, 'TANGGAL PELUNASAN', formatTanggalIndo_(o['TANGGAL PELUNASAN']));
  replacePlaceholder_(body, 'SISA PELUNASAN', formatRupiah(o['SISA PELUNASAN']));
  replacePlaceholder_(body, 'Inputed by', o['Inputed by']);

  doc.saveAndClose();

  // 3. Export ke PDF
  const pdfBlob = DriveApp.getFileById(copyFile.getId()).getAs('application/pdf');
  const fileName = (o['CUSTOMER'] || 'Nota') + '-' + uniqueId + '.pdf';
  const pdfFile = folder.createFile(pdfBlob).setName(fileName);

  // 4. Hapus Doc sementara
  try {
    copyFile.setTrashed(true);
  } catch (e) {}

  // 5. Update kolom tracking di PENJUALAN SEGERA
  setRowByHeaders_(CONFIG.SHEET_PENJUALAN, o._row, {
    'TANGGAL UPDATE NOTA': new Date(),
    'UNIQUE ID NOTA': uniqueId,
    'LINK NOTA TERAKHIR': pdfFile.getUrl(),
  });
  touchDataVersion_('orders');

  // 6. Set permission
  let sharingOk = true;
  try {
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    sharingOk = false;
  }

  return {
    url: pdfFile.getUrl(),
    uniqueId: uniqueId,
    updatedAt: new Date().toISOString(),
    sharingOk: sharingOk,
  };
}

// ===============================================
// HELPER FORMAT TANGGAL
// ===============================================

// 1. Format Lengkap dengan Waktu (Contoh: 20 Juli 2026 - 15:30 WIB)
function formatTanggalWaktuIndo_(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return '-';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  
  // Pastikan jam dan menit selalu 2 digit (09, 05, dll)
  const jam = String(date.getHours()).padStart(2, '0');
  const menit = String(date.getMinutes()).padStart(2, '0');
  
  return date.getDate() + ' ' + bulan[date.getMonth()] + ' ' + date.getFullYear() + ' - ' + jam + ':' + menit + ' WIB';
}

// 2. Format Tanggal Biasa Tanpa Waktu (Untuk Tanggal Acara, DP, dll)
function formatTanggalIndo_(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return '-';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return date.getDate() + ' ' + bulan[date.getMonth()] + ' ' + date.getFullYear();
}