/**
 * ==========================================================
 * UserAccess.gs - Kelola siapa yang boleh login + role-nya
 * Sensitif -> Owner only.
 * ==========================================================
 */

function getUserAccessList() {
  requireRole_(['Owner']);
  const list = readSheetAsObjects_(CONFIG.SHEET_USER_ACCESS);
  return list.map(function (u) {
    return { row: u._row, nama: u['NAMA'], email: u['EMAIL'], role: u['ROLE'] };
  });
}

function createUserAccess(data) {
  requireRole_(['Owner']);
  if (!data.nama) throw new Error('Nama wajib diisi.');
  if (!data.email) throw new Error('Email wajib diisi.');
  if (!data.role) throw new Error('Role wajib dipilih.');
  appendRowByHeaders_(CONFIG.SHEET_USER_ACCESS, {
    'NAMA': data.nama, 'EMAIL': data.email, 'ROLE': data.role,
  });
  touchDataVersion_('userAccess');
  return true;
}

function updateUserAccess(row, data) {
  requireRole_(['Owner']);
  setRowByHeaders_(CONFIG.SHEET_USER_ACCESS, row, {
    'NAMA': data.nama, 'EMAIL': data.email, 'ROLE': data.role,
  });
  touchDataVersion_('userAccess');
  return true;
}

function deleteUserAccess(row) {
  requireRole_(['Owner']);
  deleteRowByIndex_(CONFIG.SHEET_USER_ACCESS, row);
  touchDataVersion_('userAccess');
  return true;
}