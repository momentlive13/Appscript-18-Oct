/**
 * ==========================================================
 * MOMENT LIVE ADMIN - Code.gs
 * Entry point & konfigurasi utama
 * ==========================================================
 *
 * CATATAN SETUP:
 * - Script ini didesain sebagai BOUND SCRIPT (dibuat lewat
 *   Extensions > Apps Script langsung dari file spreadsheet backup).
 *   Kalau bound, SpreadsheetApp.getActiveSpreadsheet() otomatis
 *   nunjuk ke spreadsheet ini, TIDAK perlu isi SPREADSHEET_ID.
 * - Saat deploy sebagai Web App:
 *     Execute as: User accessing the web app
 *     Who has access: Anyone within [domain] atau daftar email tertentu
 *   Supaya Session.getActiveUser().getEmail() bisa kebaca.
 */

const CONFIG = {
  SHEET_USER_ACCESS: 'USER ACCESS',
  SHEET_PENJUALAN: 'PENJUALAN',
  SHEET_LAYANAN: 'LAYANAN',
  SHEET_VENDOR: 'DAFTAR VENDOR',
  SHEET_NOTES: 'NOTES',
  SHEET_MEETING: 'MEETING SCHEDULE',
  SHEET_DAFTAR_AKUN: 'DAFTAR AKUN',
  SHEET_TRANSAKSI: 'TRANSAKSI',

  STATUS_URUTAN: ['Penawaran', 'Deal', 'Lunas', 'Selesai'],
  STATUS_BATAL: 'Batal',

  ID_ORDER_PREFIX: 'INV-ML',

  // Ganti ID ini dengan ID Google Doc template nota kamu
  // (dari URL: docs.google.com/document/d/ID_INI/edit)
  NOTA_TEMPLATE_DOC_ID: '1Od-m-s6YMx9iXCvl0saeg_D7zGiQgyTYwGk95u-LY2g',
  NOTA_FOLDER_ID: '1yH3QToEZJOrZ83hkC8w7qdbxofbj4hzn',
};

/**
 * Entry point Web App
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template
    .evaluate()
    .setTitle('Moment Live - Admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper supaya HTML bisa include file HTML lain
 * Dipakai di Index.html: <?!= include('Styles'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Dipanggil dari JS.html SEKALI di awal (load-once ala appsheet).
 * Gabung auth + semua data (orders, layanan, vendor) jadi 1 round-trip
 * biar nggak ada loading lagi setelah ini - semua navigasi dari memori.
 */
function initialLoad() {
  const user = getCurrentUser();
  if (!user) {
    return JSON.stringify({ authorized: false });
  }
  const orders = JSON.parse(getAllOrders());
  const layanan = getLayananList();
  const vendor = getVendorList();
  const notes = getNotesList();
  const meetings = getMeetingList();
  const akun = getAkunList();
  const userAccess = user.role === 'Owner' ? getUserAccessList() : [];
  const transaksi = getTransaksiList();
  return JSON.stringify({
    authorized: true,
    user: user,
    orders: orders,
    layanan: layanan,
    vendor: vendor,
    notes: notes,
    meetings: meetings,
    akun: akun,
    userAccess: userAccess,
    transaksi: transaksi,
    lastChangeTimes: getAllChangeTimes(),
  });
}
/**
 * Refresh satu modul spesifik + kirim balik timestamp terbaru semua modul.
 * Dipanggil dari JS.html cuma untuk modul yang kedeteksi berubah,
 * jadi jauh lebih ringan daripada narik semua data tiap kali ada perubahan kecil.
 */
function refreshModule(moduleName) {
  const user = getCurrentUser();
  if (!user) return JSON.stringify({ authorized: false });

  const result = { lastChangeTimes: getAllChangeTimes() };

  if (moduleName === 'orders') result.orders = JSON.parse(getAllOrders());
  else if (moduleName === 'layanan') result.layanan = getLayananList();
  else if (moduleName === 'vendor') result.vendor = getVendorList();
  else if (moduleName === 'notes') result.notes = getNotesList();
  else if (moduleName === 'meetings') result.meetings = getMeetingList();
  else if (moduleName === 'akun') result.akun = getAkunList();
  else if (moduleName === 'transaksi') result.transaksi = getTransaksiList();
  else if (moduleName === 'userAccess') result.userAccess = user.role === 'Owner' ? getUserAccessList() : [];

  return JSON.stringify(result);
}