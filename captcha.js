/* ===========================================================
   CAPTCHA sederhana berbasis canvas (soal matematika + noise)
   Tidak butuh API key eksternal — cocok untuk demo / internal use.
   Untuk produksi, ganti dengan layanan seperti hCaptcha / Turnstile.
=========================================================== */

let __captchaAnswer = null;

function renderCaptcha(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

  // background gradasi lembut
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#EAF8EF");
  grad.addColorStop(1, "#D9F0E1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // noise lines
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(31,122,77,${Math.random() * 0.3 + 0.1})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }
  // noise dots
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(20,24,22,${Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ["+", "-"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  __captchaAnswer = op === "+" ? a + b : a - b;

  const text = `${a} ${op} ${b} = ?`;
  ctx.font = "bold 22px Poppins, sans-serif";
  ctx.fillStyle = "#14181A";
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((Math.random() - 0.5) * 0.08);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function checkCaptcha(inputValue) {
  if (__captchaAnswer === null) return false;
  return parseInt(inputValue, 10) === __captchaAnswer;
}
