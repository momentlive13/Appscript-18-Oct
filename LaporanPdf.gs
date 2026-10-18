// =======================================================
// BACKEND EXPORT LAPORAN KEUANGAN KE PDF (GABUNGAN + MODERN STYLE)
// =======================================================

const TEMPLATE_LAPORAN_DOC_ID = '1oY1TwalJzgC8sFrqKAmaYJqeZD5qTcgr9q_BGn8Cqzs'; 
const FOLDER_LAPORAN_ID = '1evhG2u2wodzSzOBMeYMwFtLGcW9E0AT4';

function generateLaporanPdfBackend(data) {
  try {
    const templateFile = DriveApp.getFileById(TEMPLATE_LAPORAN_DOC_ID);
    const fileName = 'Laporan_Keuangan_' + data.startDate + '_sd_' + data.endDate;
    const tempCopy = templateFile.makeCopy(fileName);
    const doc = DocumentApp.openById(tempCopy.getId());
    const body = doc.getBody();

    // 1. Replace Header Info (Teks dokumen tidak diubah, murni replace)
    const today = new Date();
    const dateCetakStr = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
    
    body.replaceText('{{PERIODE}}', data.startDate + ' s/d ' + data.endDate);
    body.replaceText('{{JENIS_LAPORAN}}', 'LABA RUGI & NERACA');
    body.replaceText('{{TANGGAL_CETAK}}', dateCetakStr);

    // ==========================================
    // BAGIAN 1: TABEL LABA RUGI
    // ==========================================
    body.appendParagraph('1. LAPORAN LABA RUGI').setBold(true);
    const tableLR = body.appendTable();
    
    // Setting Border Tipis Abu-abu
    tableLR.setBorderWidth(0.5);
    tableLR.setBorderColor('#D1D5DB'); 
    
    // Header Tabel
    const headerLR = tableLR.appendTableRow();
    headerLR.appendTableCell('KODE & NAMA AKUN').setBold(true).setBackgroundColor('#F1F5F9');
    const h2LR = headerLR.appendTableCell('NOMINAL (Rp)');
    h2LR.setBold(true).setBackgroundColor('#F1F5F9');
    h2LR.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

    // Isi Tabel Laba Rugi
    addCategoryHeader_(tableLR, 'PENDAPATAN');
    (data.pendapatanList || []).forEach(function(item) { addAccountRow_(tableLR, item.kode + ' - ' + item.nama, item.nominalStr); });
    addTotalRow_(tableLR, 'TOTAL PENDAPATAN', data.totalPendapatan);

    addCategoryHeader_(tableLR, 'BEBAN / BIAYA');
    (data.bebanList || []).forEach(function(item) { addAccountRow_(tableLR, item.kode + ' - ' + item.nama, item.nominalStr); });
    addTotalRow_(tableLR, 'TOTAL BEBAN', data.totalBeban);

    addGrandTotalRow_(tableLR, 'LABA / (RUGI) BERSIH', data.labaBersih);


    // ==========================================
    // PINDAH HALAMAN (PAGE BREAK)
    // ==========================================
    body.appendPageBreak();

    // ==========================================
    // BAGIAN 2: TABEL NERACA
    // ==========================================
    body.appendParagraph('2. LAPORAN NERACA MUTASI').setBold(true);
    const tableN = body.appendTable();
    
    // Setting Border Tipis Abu-abu
    tableN.setBorderWidth(0.5);
    tableN.setBorderColor('#D1D5DB');
    
    // Header Tabel
    const headerN = tableN.appendTableRow();
    headerN.appendTableCell('KODE & NAMA AKUN').setBold(true).setBackgroundColor('#F1F5F9');
    const h2N = headerN.appendTableCell('NOMINAL (Rp)');
    h2N.setBold(true).setBackgroundColor('#F1F5F9');
    h2N.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

    // Isi Tabel Neraca
    addCategoryHeader_(tableN, 'ASET (HARTA)');
    (data.asetList || []).forEach(function(item) { addAccountRow_(tableN, item.kode + ' - ' + item.nama, item.nominalStr); });
    addTotalRow_(tableN, 'TOTAL ASET', data.totalAset);

    addCategoryHeader_(tableN, 'LIABILITAS (UTANG)');
    (data.liabilitasList || []).forEach(function(item) { addAccountRow_(tableN, item.kode + ' - ' + item.nama, item.nominalStr); });
    
    // --- TAMBAHAN BARIS TOTAL LIABILITAS ---
    addTotalRow_(tableN, 'TOTAL LIABILITAS', data.totalLiabilitas);

    addCategoryHeader_(tableN, 'EKUITAS (MODAL)');
    (data.ekuitasList || []).forEach(function(item) { addAccountRow_(tableN, item.kode + ' - ' + item.nama, item.nominalStr); });
    
    addTotalRow_(tableN, 'Laba / (Rugi) Periode Terpilih', data.labaPeriodeIni);
    
    // --- TAMBAHAN BARIS TOTAL EKUITAS ---
    addTotalRow_(tableN, 'TOTAL EKUITAS', data.totalEkuitasAkhir);

    addTotalRow_(tableN, 'TOTAL LIABILITAS & EKUITAS', data.totalPasiva);

    // ==========================================
    // 3. Simpan & Convert ke PDF di Folder Khusus
    // ==========================================
    doc.saveAndClose();
    const pdfBlob = tempCopy.getAs('application/pdf');
    
    const targetFolder = DriveApp.getFolderById(FOLDER_LAPORAN_ID);
    const pdfFile = targetFolder.createFile(pdfBlob).setName(fileName + '.pdf');
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    tempCopy.setTrashed(true);

    return { success: true, url: pdfFile.getUrl() };
  } catch (err) {
    throw new Error('Gagal memproses PDF: ' + err.message);
  }
}


// =======================================================
// HELPER STYLING BARIS TABEL (CLEAN & MODERN)
// =======================================================

function addCategoryHeader_(table, title) {
  const row = table.appendTableRow();
  row.appendTableCell(title).setBold(true).setPaddingTop(12).setPaddingBottom(4);
  row.appendTableCell('').setPaddingTop(12).setPaddingBottom(4); // Kolom nominal kosong
}

function addAccountRow_(table, name, amount) {
  const row = table.appendTableRow();
  row.appendTableCell('   ' + name).setPaddingTop(4).setPaddingBottom(4);
  
  const cellNominal = row.appendTableCell(amount);
  cellNominal.setPaddingTop(4).setPaddingBottom(4);
  // Bikin rata kanan (Right Align)
  cellNominal.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
}

function addTotalRow_(table, label, amount) {
  const row = table.appendTableRow();
  row.appendTableCell(label).setBold(true).setBackgroundColor('#F8FAFC').setPaddingTop(8).setPaddingBottom(8);
  
  const cellNominal = row.appendTableCell(amount);
  cellNominal.setBold(true).setBackgroundColor('#F8FAFC').setPaddingTop(8).setPaddingBottom(8);
  cellNominal.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
}

function addGrandTotalRow_(table, label, amount) {
  const row = table.appendTableRow();
  
  // Jika teks amount ada tanda minus, warnanya merah pastel. Jika tidak, hijau pastel.
  const bgLabaRugi = amount.indexOf('-') !== -1 ? '#FDE8EC' : '#E7F9EE'; 
  
  row.appendTableCell(label).setBold(true).setBackgroundColor(bgLabaRugi).setPaddingTop(12).setPaddingBottom(12);
  
  const cellNominal = row.appendTableCell(amount);
  cellNominal.setBold(true).setBackgroundColor(bgLabaRugi).setPaddingTop(12).setPaddingBottom(12);
  cellNominal.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
}