/**
 * ==========================================================
 * Notes.gs - Catatan pribadi ala Google Keep
 * ==========================================================
 */

function getNotesList() {
  requireRole_(['Owner', 'Admin']);
  const list = readSheetAsObjects_(CONFIG.SHEET_NOTES);
  return list.map(function (n) {
    return { row: n._row, judul: n['Judul Catatan'], isi: n['Isi Catatan'], warna: n['WARNA'] || '#EEF0FF' };
  });
}

function createNote(data) {
  requireRole_(['Owner', 'Admin']);
  if (!data.judul) throw new Error('Judul wajib diisi.');
  appendRowByHeaders_(CONFIG.SHEET_NOTES, {
    'Judul Catatan': data.judul, 'Isi Catatan': data.isi || '', 'WARNA': data.warna || '#EEF0FF',
  });
  touchDataVersion_('notes');
  return true;
}

function updateNote(row, data) {
  requireRole_(['Owner', 'Admin']);
  setRowByHeaders_(CONFIG.SHEET_NOTES, row, {
    'Judul Catatan': data.judul, 'Isi Catatan': data.isi || '', 'WARNA': data.warna || '#EEF0FF',
  });
  touchDataVersion_('notes');
  return true;
}

function deleteNote(row) {
  requireRole_(['Owner', 'Admin']);
  deleteRowByIndex_(CONFIG.SHEET_NOTES, row);
  touchDataVersion_('notes');
  return true;
}