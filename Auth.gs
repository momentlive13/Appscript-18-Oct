/**
 * ==========================================================
 * Auth.gs - Login otomatis berdasar akun Google yang aktif
 * ==========================================================
 */

/**
 * Ambil user yang sedang login (dari akun Google browser),
 * cocokkan ke sheet USER ACCESS, return {nama, email, role} atau null
 * kalau email tidak terdaftar.
 */
function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  if (!email) return null;

  const users = readSheetAsObjects_(CONFIG.SHEET_USER_ACCESS);
  const found = users.find(function (u) {
    return String(u['EMAIL']).trim().toLowerCase() === email.trim().toLowerCase();
  });

  if (!found) return null;

  return {
    nama: found['NAMA'],
    email: found['EMAIL'],
    role: found['ROLE'], // 'Owner' | 'Admin' | 'Vendor'
  };
}

/**
 * Helper: lempar error kalau role tidak diizinkan.
 * Dipanggil di awal setiap fungsi backend yang butuh proteksi role.
 * allowedRoles contoh: ['Owner','Admin']
 */
function requireRole_(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: akun tidak terdaftar di USER ACCESS.');
  }
  if (allowedRoles.indexOf(user.role) === -1) {
    throw new Error('FORBIDDEN: role "' + user.role + '" tidak punya akses ke fitur ini.');
  }
  return user;
}