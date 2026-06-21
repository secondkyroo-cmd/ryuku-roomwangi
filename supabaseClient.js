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
const USERNAME_EMAIL_DOMAIN = "gmail.com";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  // Library CDN belum termuat saat file ini dijalankan — biasanya karena
  // urutan <script> salah, koneksi internet lambat, atau CDN diblokir.
  alert("Gagal memuat library Supabase. Cek koneksi internet atau urutan <script> di file HTML.");
  throw new Error("Supabase JS library (window.supabase) belum tersedia.");
}

// Catatan: variabel client SENGAJA tidak dinamai "supabase" untuk
// menghindari konflik dengan namespace global "window.supabase" milik
// library itu sendiri — konflik nama ini adalah sumber bug
// "Cannot read properties of undefined (reading 'signUp')".
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}
