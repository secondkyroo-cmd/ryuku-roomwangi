/* ===========================================================
   KONFIGURASI SUPABASE
   1. Buka project Supabase kamu > Settings > API
   2. Salin "Project URL" dan "anon public key" ke bawah ini
   3. File ini di-include sebelum auth.js / home.js / admin.js
=========================================================== */

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Domain palsu untuk memetakan "username" menjadi format email
// yang dibutuhkan oleh Supabase Auth (lihat README bagian Auth).
const USERNAME_EMAIL_DOMAIN = "users.hijauku.app";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}
