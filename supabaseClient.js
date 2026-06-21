/* ===========================================================
   KONFIGURASI SUPABASE
   1. Buka project Supabase kamu > Settings > API
   2. Salin "Project URL" dan "anon public key" ke bawah ini
   3. File ini di-include sebelum auth.js / home.js / admin.js
=========================================================== */

const SUPABASE_URL = "https://pbbekpviydafuthojkho.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZrxJxzJK4rcXtKP7b-2bOQ_VMWXghig";

// Domain palsu untuk memetakan "username" menjadi format email
// yang dibutuhkan oleh Supabase Auth (lihat README bagian Auth).
const USERNAME_EMAIL_DOMAIN = "user.ryukuu";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}
