/**
 * ==========================================================
 * Utils.gs - Helper umum dipakai semua modul
 * ==========================================================
 */

/**
 * Ambil sheet berdasarkan nama, error jelas kalau tidak ketemu
 * (biar gampang debug kalau ada typo nama sheet)
 */
function getSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Cek nama sheet di spreadsheet.');
  }
  return sheet;
}

/**
 * Baca seluruh data sheet, kembalikan sebagai array of object
 * key-nya diambil dari row 1 (header), row kosong di-skip.
 * Setiap object juga dapet field _row (nomor baris asli di sheet,
 * dipakai buat update/delete tanpa perlu ID manual).
 */
function readSheetAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const result = [];
  data.forEach(function (row, idx) {
    // skip baris yang benar-benar kosong (kolom pertama kosong)
    if (row[0] === '' && row.every(function (v) { return v === ''; })) return;

    const obj = { _row: idx + 2 }; // +2 karena data mulai row 2, idx 0-based
    headers.forEach(function (h, colIdx) {
      if (h) obj[h] = row[colIdx];
    });
    result.push(obj);
  });
  return result;
}

/**
 * Cari index kolom (1-based, buat dipakai di getRange) berdasarkan nama header.
 * Return -1 kalau tidak ketemu.
 */
function getColIndexByHeader_(sheetName, headerName) {
  const sheet = getSheet_(sheetName);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return headers.indexOf(headerName) + 1; // +1 karena indexOf 0-based, range 1-based
}

/**
 * Update satu cell berdasarkan nomor baris + nama header kolom.
 */
function setCellByHeader_(sheetName, row, headerName, value) {
  const col = getColIndexByHeader_(sheetName, headerName);
  if (col === 0) throw new Error('Kolom "' + headerName + '" tidak ditemukan di sheet ' + sheetName);
  getSheet_(sheetName).getRange(row, col).setValue(value);
}

/**
 * Update banyak kolom sekaligus dalam satu baris (lebih efisien dari
 * panggil setCellByHeader_ berkali-kali karena batch write).
 * dataObj = { 'NAMA HEADER': value, ... }
 */
function setRowByHeaders_(sheetName, row, dataObj) {
  const sheet = getSheet_(sheetName);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const currentValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  headers.forEach(function (h, idx) {
    if (Object.prototype.hasOwnProperty.call(dataObj, h)) {
      currentValues[idx] = dataObj[h];
    }
  });
  sheet.getRange(row, 1, 1, lastCol).setValues([currentValues]);
}

/**
 * Tambah baris baru di akhir sheet berdasarkan object {header: value}.
 * Generic - pakai getLastRow()+1 biasa, aman buat sheet manapun.
 */
function appendRowByHeaders_(sheetName, dataObj) {
  const sheet = getSheet_(sheetName);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const newRow = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(dataObj, h) ? dataObj[h] : '';
  });
  sheet.appendRow(newRow);
  return sheet.getLastRow();
}

/**
 * Generic - cari baris kosong berdasarkan kolom acuan tertentu (bukan getLastRow()
 * biasa), menghindari "loncat" ke baris jauh gara-gara sisa formatting/data lama
 * di bawah baris yang sebenarnya terpakai. Dipakai untuk sheet migrasi appsheet
 * yang riwayatnya panjang (Penjualan, Transaksi, dst).
 */
function appendRowSafely_(sheetName, dataObj, anchorHeader) {
  const sheet = getSheet_(sheetName);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const anchorCol = headers.indexOf(anchorHeader) + 1;
  const anchorValues = sheet.getRange(2, anchorCol, sheet.getMaxRows() - 1, 1).getValues();
  let targetRow = 2;
  for (let i = 0; i < anchorValues.length; i++) {
    if (anchorValues[i][0] === '') { targetRow = i + 2; break; }
    targetRow = i + 3;
  }

  const newRow = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(dataObj, h) ? dataObj[h] : '';
  });
  sheet.getRange(targetRow, 1, 1, lastCol).setValues([newRow]);
  return targetRow;
}

/**
 * Khusus PENJUALAN: cari baris kosong berdasarkan kolom ID. ORDER (bukan
 * seluruh sheet), menghindari "loncat" ke baris jauh gara-gara sisa
 * formatting appsheet di baris-baris kosong bawah.
 */
function appendPenjualanRow_(dataObj) {
  return appendRowSafely_(CONFIG.SHEET_PENJUALAN, dataObj, 'ID. ORDER');
}

function deleteRowByIndex_(sheetName, row) {
  getSheet_(sheetName).deleteRow(row);
}

/**
 * Format tanggal jadi "yyyy-MM-dd" pakai timezone Jakarta EKSPLISIT,
 * bukan UTC (yang bikin geser -1 hari kalau dikonversi via toISOString()).
 */
function formatDateOnly_(val) {
  if (!val) return '';
  const date = new Date(val);
  if (isNaN(date)) return '';
  return Utilities.formatDate(date, 'Asia/Jakarta', 'yyyy-MM-dd');
}

/**
 * ---------- VERSION MARKER (PER MODUL) ----------
 * Dipanggil di akhir setiap fungsi create/update/delete, dengan nama modulnya.
 * Nyimpen "waktu terakhir ada perubahan" PER MODUL di PropertiesService,
 * jadi client bisa tahu modul mana aja yang berubah dan cuma refresh itu.
 */
function touchDataVersion_(moduleName) {
  PropertiesService.getScriptProperties().setProperty('lastChangeTime_' + moduleName, String(Date.now()));
}

/**
 * Endpoint ringan buat polling client. TIDAK baca spreadsheet sama sekali.
 * Return timestamp terakhir tiap modul, biar client bisa bandingin satu-satu
 * dan cuma refresh modul yang benar-benar berubah.
 */
function getAllChangeTimes() {
  const modules = ['orders', 'layanan', 'vendor', 'notes', 'meetings', 'akun', 'transaksi', 'userAccess'];
  const props = PropertiesService.getScriptProperties();
  const result = {};
  modules.forEach(function (m) {
    result[m] = Number(props.getProperty('lastChangeTime_' + m)) || 0;
  });
  return result;
}

function formatRupiah(number) {
  if (number === '' || number === null || isNaN(number)) return 'Rp0';
  return 'Rp' + Math.round(number).toLocaleString('id-ID');
}

function generateUniqueId8_() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 8);
}

/**
 * Generate ID Order format: INV-ML-XXX-MM/YYYY
 * Nomor urut lanjut terus sepanjang tahun berjalan, reset ke 001 tiap ganti tahun.
 * Contoh: INV-ML-126-04/2026
 */
function generateIdOrder_() {
  const sheet = getSheet_(CONFIG.SHEET_PENJUALAN);
  const lastRow = sheet.getLastRow();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = ('0' + (now.getMonth() + 1)).slice(-2);

  if (lastRow < 2) {
    return CONFIG.ID_ORDER_PREFIX + '-001-' + currentMonth + '/' + currentYear;
  }

  const idCol = getColIndexByHeader_(CONFIG.SHEET_PENJUALAN, 'ID. ORDER');
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues().flat();

  let maxSeq = 0;
  const yearSuffix = '/' + currentYear;
  ids.forEach(function (id) {
    if (typeof id === 'string' && id.indexOf(yearSuffix) !== -1) {
      const parts = id.split('-');
      // format: INV-ML-XXX-MM/YYYY -> parts = ['INV','ML','XXX','MM/YYYY']
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  const seqStr = ('000' + nextSeq).slice(-3);
  return CONFIG.ID_ORDER_PREFIX + '-' + seqStr + '-' + currentMonth + '/' + currentYear;
}