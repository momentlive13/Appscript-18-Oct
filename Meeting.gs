/**
 * ==========================================================
 * MeetingSchedule.gs - Jadwal meeting (list + status)
 * ==========================================================
 */

function getMeetingList() {
  requireRole_(['Owner', 'Admin']);
  const list = readSheetAsObjects_(CONFIG.SHEET_MEETING);
  return list.map(function (m) {
    return {
      row: m._row,
      tanggal: m['TANGGAL'] ? new Date(m['TANGGAL']).toISOString() : '',
      waktu: m['WAKTU'] || '',
      acara: m['ACARA'] || '',
      keterangan: m['KETERANGAN'] || '',
      status: m['STATUS'] || 'On Process',
    };
  });
}

function createMeeting(data) {
  requireRole_(['Owner', 'Admin']);
  if (!data.acara) throw new Error('Acara wajib diisi.');
  if (!data.tanggal) throw new Error('Tanggal wajib diisi.');
  appendRowByHeaders_(CONFIG.SHEET_MEETING, {
    'TANGGAL': new Date(data.tanggal), 'WAKTU': data.waktu || '', 'ACARA': data.acara,
    'KETERANGAN': data.keterangan || '', 'STATUS': data.status || 'On Process',
    'REMINDER H-2 TERKIRIM': '', 'REMINDER PAGI TERKIRIM': '',
  });
  touchDataVersion_('meetings');
  return true;
}

function updateMeeting(row, data) {
  requireRole_(['Owner', 'Admin']);
  setRowByHeaders_(CONFIG.SHEET_MEETING, row, {
    'TANGGAL': new Date(data.tanggal), 'WAKTU': data.waktu || '', 'ACARA': data.acara,
    'KETERANGAN': data.keterangan || '', 'STATUS': data.status || 'On Process',
    // Reset flag reminder tiap kali tanggal/jam diedit, biar reminder ke-trigger ulang sesuai jadwal baru
    'REMINDER H-2 TERKIRIM': '', 'REMINDER PAGI TERKIRIM': '',
  });
  touchDataVersion_('meetings');
  return true;
}

function deleteMeeting(row) {
  requireRole_(['Owner', 'Admin']);
  deleteRowByIndex_(CONFIG.SHEET_MEETING, row);
  touchDataVersion_('meetings');
  return true;
}