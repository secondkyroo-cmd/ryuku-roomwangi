/* ===========================================================
   AUTH — login, daftar, captcha, "ingat saya"
=========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderCaptcha("loginCaptchaCanvas");
  renderCaptcha("regCaptchaCanvas");
  redirectIfAlreadyLoggedIn();
});

async function redirectIfAlreadyLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) window.location.href = "home.html";
}

function switchTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.getElementById("loginForm").style.display = tab === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = tab === "register" ? "block" : "none";
  hideMsg();
}

function togglePw(id, el) {
  const input = document.getElementById(id);
  const isPw = input.type === "password";
  input.type = isPw ? "text" : "password";
  el.textContent = isPw ? "SEMBUNYI" : "LIHAT";
}

function showMsg(text, type) {
  const box = document.getElementById("formMsg");
  box.textContent = text;
  box.className = `form-msg show ${type}`;
}
function hideMsg() {
  document.getElementById("formMsg").className = "form-msg";
}

/* ---------------- LOGIN ---------------- */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const captchaInput = document.getElementById("loginCaptchaInput").value;
  const remember = document.getElementById("rememberMe").checked;
  const btn = document.getElementById("loginBtn");

  if (!checkCaptcha(captchaInput)) {
    showMsg("Jawaban captcha salah, silakan coba lagi.", "error");
    renderCaptcha("loginCaptchaCanvas");
    document.getElementById("loginCaptchaInput").value = "";
    return;
  }

  btn.disabled = true; btn.textContent = "Memproses...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  btn.disabled = false; btn.textContent = "Masuk";

  if (error) {
    showMsg("Username atau password salah.", "error");
    renderCaptcha("loginCaptchaCanvas");
    return;
  }

  // "Ingat saya": simpan preferensi & username terakhir di localStorage.
  // Sesi Supabase sendiri sudah persist via localStorage (persistSession:true).
  // Jika tidak dicentang, kita tandai agar sesi dibersihkan saat tab ditutup.
  if (remember) {
    localStorage.setItem("hijauku_remember", "1");
    localStorage.setItem("hijauku_last_username", username);
  } else {
    localStorage.removeItem("hijauku_remember");
    sessionStorage.setItem("hijauku_session_only", "1");
  }

  showMsg("Berhasil masuk, mengalihkan...", "success");
  setTimeout(() => window.location.href = "home.html", 600);
});

/* ---------------- REGISTER ---------------- */
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg();

  const username = document.getElementById("regUsername").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const password2 = document.getElementById("regPassword2").value;
  const captchaInput = document.getElementById("regCaptchaInput").value;
  const btn = document.getElementById("registerBtn");

  if (!checkCaptcha(captchaInput)) {
    showMsg("Jawaban captcha salah, silakan coba lagi.", "error");
    renderCaptcha("regCaptchaCanvas");
    document.getElementById("regCaptchaInput").value = "";
    return;
  }
  if (password !== password2) {
    showMsg("Konfirmasi password tidak cocok.", "error");
    return;
  }
  if (!/^[a-z0-9_.]+$/.test(username)) {
    showMsg("Username hanya boleh huruf kecil, angka, titik, underscore.", "error");
    return;
  }

  btn.disabled = true; btn.textContent = "Memproses...";

  const { data, error } = await supabaseClient.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username } }
  });

  btn.disabled = false; btn.textContent = "Daftar akun baru";

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      showMsg("Username sudah digunakan, coba username lain.", "error");
    } else {
      showMsg(error.message, "error");
    }
    renderCaptcha("regCaptchaCanvas");
    return;
  }

  showMsg("Akun berhasil dibuat! Mengalihkan ke halaman masuk...", "success");
  setTimeout(() => switchTab("login"), 1200);
});
