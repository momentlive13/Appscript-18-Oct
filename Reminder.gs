/**
 * ==========================================================
 * Reminder.gs - Reminder email untuk jadwal meeting vendor
 * ==========================================================
 * Dua jenis reminder:
 * 1. H-2 jam sebelum meeting (per acara, dicek tiap 15 menit)
 * 2. Pagi jam 8 WIB, rangkuman semua meeting hari itu
 *
 * SETUP (wajib dilakukan sekali lewat editor Apps Script):
 *   Jalankan fungsi setupReminderTriggers() SEKALI SAJA secara manual
 *   dari editor (pilih fungsi ini di dropdown, klik Run).
 *   Ini akan mendaftarkan 2 trigger otomatis:
 *     - checkReminderH2()   -> tiap 15 menit
 *     - checkReminderPagi() -> tiap hari jam 8 pagi WIB
 * ==========================================================
 */

const REMINDER_EMAIL_TUJUAN = 'ampaskopi06@gmail.com';

/**
 * Jalankan fungsi ini SEKALI dari editor Apps Script untuk memasang trigger.
 * Kalau dijalankan berkali-kali, trigger lama akan dihapus dulu biar gak dobel.
 */
function setupReminderTriggers() {
  // Hapus trigger reminder lama (kalau ada) biar gak dobel-dobel kalau fungsi ini dijalankan ulang
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const fn = t.getHandlerFunction();
    if (fn === 'checkReminderH2' || fn === 'checkReminderPagi') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('checkReminderH2')
    .timeBased()
    .everyMinutes(15)
    .create();

  ScriptApp.newTrigger('checkReminderPagi')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .inTimezone('Asia/Jakarta')
    .create();

  Logger.log('Trigger reminder berhasil dipasang.');
}

/**
 * Ambil semua data meeting mentah langsung dari sheet (bukan lewat getMeetingList,
 * karena getMeetingList butuh login/role - trigger jalan tanpa user yang login).
 */
function getMeetingRowsForReminder_() {
  return readSheetAsObjects_(CONFIG.SHEET_MEETING);
}

/**
 * Gabungkan TANGGAL (Date) + WAKTU (string "HH:mm") jadi satu Date object,
 * dalam zona waktu Asia/Jakarta.
 */
function combineTanggalWaktu_(tanggal, waktuStr) {
  if (!tanggal || !waktuStr) return null;
  const parts = String(waktuStr).split(':');
  if (parts.length < 2) return null;
  const jam = Number(parts[0]);
  const menit = Number(parts[1]);
  if (isNaN(jam) || isNaN(menit)) return null;

  const tglStr = Utilities.formatDate(new Date(tanggal), 'Asia/Jakarta', 'yyyy-MM-dd');
  return new Date(tglStr + 'T' + String(jam).padStart(2, '0') + ':' + String(menit).padStart(2, '0') + ':00+07:00');
}

const STATUS_SKIP_REMINDER = ['Selesai', 'Batal'];

/**
 * Reminder H-2 jam: dicek tiap 15 menit, kirim email kalau ada meeting
 * yang waktunya jatuh sekitar 2 jam lagi dari sekarang.
 */
function checkReminderH2() {
  const now = new Date();
  const rows = getMeetingRowsForReminder_();

  rows.forEach(function (m) {
    if (STATUS_SKIP_REMINDER.indexOf(m['STATUS']) !== -1) return;
    if (m['REMINDER H-2 TERKIRIM']) return; // sudah pernah dikirim

    const waktuMeeting = combineTanggalWaktu_(m['TANGGAL'], m['WAKTU']);
    if (!waktuMeeting) return; // WAKTU belum diisi, gak bisa dihitung H-2 nya

    const selisihMenit = (waktuMeeting - now) / 60000;

    // Window 105-120 menit sebelum meeting (karena trigger jalan tiap 15 menit,
    // window ini memastikan tiap meeting kena tepat 1 kali kirim)
    if (selisihMenit <= 120 && selisihMenit > 105) {
      kirimEmailReminder_(
        'Reminder: ' + m['ACARA'] + ' (2 jam lagi)',
        buildBodyReminderSatuan_(m, waktuMeeting)
      );
      setRowByHeaders_(CONFIG.SHEET_MEETING, m._row, { 'REMINDER H-2 TERKIRIM': new Date() });
    }
  });
}

/**
 * Reminder pagi: dicek jam 8 pagi WIB, kirim 1 email rangkuman
 * semua meeting yang jadwalnya HARI INI.
 */
function checkReminderPagi() {
  const rows = getMeetingRowsForReminder_();
  const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');

  const meetingHariIni = rows.filter(function (m) {
    if (STATUS_SKIP_REMINDER.indexOf(m['STATUS']) !== -1) return false;
    if (m['REMINDER PAGI TERKIRIM']) return false;
    if (!m['TANGGAL']) return false;
    const tglStr = Utilities.formatDate(new Date(m['TANGGAL']), 'Asia/Jakarta', 'yyyy-MM-dd');
    return tglStr === todayStr;
  });

  if (meetingHariIni.length === 0) return;

  kirimEmailReminder_(
    'Jadwal Meeting Hari Ini (' + meetingHariIni.length + ' acara)',
    buildBodyReminderRangkuman_(meetingHariIni)
  );

  meetingHariIni.forEach(function (m) {
    setRowByHeaders_(CONFIG.SHEET_MEETING, m._row, { 'REMINDER PAGI TERKIRIM': new Date() });
  });
}

function buildBodyReminderSatuan_(m, waktuMeeting) {
  const jamStr = Utilities.formatDate(waktuMeeting, 'Asia/Jakarta', 'HH:mm');
  return 'Acara: ' + m['ACARA'] + '\n' +
         'Jam: ' + jamStr + ' WIB\n' +
         (m['KETERANGAN'] ? 'Keterangan: ' + m['KETERANGAN'] + '\n' : '') +
         '\n2 jam lagi dari sekarang.';
}

function buildBodyReminderRangkuman_(list) {
  return list.map(function (m) {
    return '- ' + (m['WAKTU'] || '(jam belum diisi)') + ' - ' + m['ACARA'] +
           (m['KETERANGAN'] ? ' (' + m['KETERANGAN'] + ')' : '');
  }).join('\n');
}

function kirimEmailReminder_(subject, body) {
  MailApp.sendEmail(REMINDER_EMAIL_TUJUAN, subject, body);
}

/**
 * VERSI DIAGNOSTIK - PAKAI SEMENTARA UNTUK CARI TAU KENAPA REMINDER GAK KEKIRIM.
 * Ganti sementara isi fungsi checkReminderH2 di Reminder.gs dengan versi ini,
 * lalu jalankan MANUAL (pilih checkReminderH2DiagnosticDebug di dropdown, klik Run).
 * Setelah itu buka View > Logs (atau Ctrl+Enter) buat lihat hasilnya.
 * Nanti kalau sudah ketemu masalahnya, balikin lagi ke versi checkReminderH2 yang asli.
 */
function checkReminderH2DiagnosticDebug() {
  const now = new Date();
  Logger.log('=== MULAI CEK. Waktu sekarang: ' + now + ' ===');

  const rows = getMeetingRowsForReminder_();
  Logger.log('Jumlah baris meeting terbaca: ' + rows.length);

  rows.forEach(function (m) {
    Logger.log('--- Baris ' + m._row + ': ' + m['ACARA'] + ' ---');
    Logger.log('STATUS mentah: "' + m['STATUS'] + '"');
    Logger.log('TANGGAL mentah: ' + m['TANGGAL'] + ' (tipe: ' + (typeof m['TANGGAL']) + ')');
    Logger.log('WAKTU mentah: "' + m['WAKTU'] + '" (tipe: ' + (typeof m['WAKTU']) + ')');
    Logger.log('REMINDER H-2 TERKIRIM mentah: "' + m['REMINDER H-2 TERKIRIM'] + '"');

    if (STATUS_SKIP_REMINDER.indexOf(m['STATUS']) !== -1) {
      Logger.log('=> DI-SKIP karena STATUS termasuk yang di-skip.');
      return;
    }
    if (m['REMINDER H-2 TERKIRIM']) {
      Logger.log('=> DI-SKIP karena REMINDER H-2 TERKIRIM sudah ada isinya.');
      return;
    }

    const waktuMeeting = combineTanggalWaktu_(m['TANGGAL'], m['WAKTU']);
    Logger.log('Hasil gabungan TANGGAL+WAKTU: ' + waktuMeeting);

    if (!waktuMeeting) {
      Logger.log('=> DI-SKIP karena gagal gabungin TANGGAL+WAKTU (kemungkinan format WAKTU salah).');
      return;
    }

    const selisihMenit = (waktuMeeting - now) / 60000;
    Logger.log('Selisih menit dari sekarang ke waktu meeting: ' + selisihMenit);

    if (selisihMenit <= 120 && selisihMenit > 105) {
      Logger.log('=> COCOK! Harusnya kirim email sekarang.');
    } else {
      Logger.log('=> TIDAK cocok jendela waktu (butuh antara 105-120 menit lagi).');
    }
  });

  Logger.log('=== SELESAI CEK ===');
}