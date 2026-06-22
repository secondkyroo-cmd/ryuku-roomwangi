/* ===========================================================
   HOME — logic untuk halaman marketplace utama
=========================================================== */

const PRODUCTS_PER_PAGE = 8;

let currentUser = null;
let currentProfile = null;
let resellerDiscountPercent = 0;

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data?.session) { window.location.href = "index.html"; return; }
  currentUser = data.session.user;

  await loadProfile();
  await loadSettings();
  await loadBanners();
  await loadProducts();

  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", applyFilters);
  document.getElementById("layoutSelect").addEventListener("change", onLayoutChange);

  initFooterSlides();
}

/* ---------------- LAYOUT KATALOG (ke bawah / ke samping) ---------------- */
function onLayoutChange(e) {
  const grid = document.getElementById("catalogGrid");
  grid.classList.toggle("layout-horizontal", e.target.value === "horizontal");
}

/* ---------------- FOOTER SLIDES (kredit perusahaan) ---------------- */
function initFooterSlides() {
  const wrap = document.getElementById("footerSlides");
  const dotsWrap = document.getElementById("footerSlideDots");
  if (!wrap || !dotsWrap) return;

  const slides = wrap.querySelectorAll(".footer-slide");
  if (slides.length <= 1) { dotsWrap.style.display = "none"; return; }

  dotsWrap.innerHTML = "";
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => {
      wrap.scrollTo({ left: wrap.clientWidth * i, behavior: "smooth" });
    });
    dotsWrap.appendChild(dot);
  });

  wrap.addEventListener("scroll", () => {
    const idx = Math.round(wrap.scrollLeft / wrap.clientWidth);
    dotsWrap.querySelectorAll("span").forEach((d, i) => d.classList.toggle("active", i === idx));
  });
}

/* ---------------- PROFILE / ROLE ---------------- */
async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !data) return;
  currentProfile = data;

  document.getElementById("roleChip").textContent = data.role.toUpperCase();
  document.getElementById("adminLink").style.display = (data.role === "admin") ? "inline-block" : "none";

  document.getElementById("profileAvatar").textContent = data.username.charAt(0).toUpperCase();
  document.getElementById("profileUsername").textContent = data.username;
  document.getElementById("profileRole").textContent = data.role;
  document.getElementById("profileJoined").textContent = new Date(data.created_at).toLocaleDateString("id-ID", { year:"numeric", month:"long", day:"numeric" });
}

async function loadSettings() {
  const { data } = await supabaseClient.from("settings").select("*").eq("key", "reseller_discount_percent").single();
  resellerDiscountPercent = data ? parseFloat(data.value) : 0;

  document.getElementById("profileDiscount").textContent =
    currentProfile?.role === "reseller" ? `${resellerDiscountPercent}% di semua produk` : "Tidak berlaku";
}

function logout() {
  supabaseClient.auth.signOut().then(() => window.location.href = "index.html");
}

/* ---------------- NAV PILLS / VIEWS ---------------- */
function switchView(view) {
  document.querySelectorAll(".nav-pill").forEach(p => p.classList.toggle("active", p.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  if (view === "riwayat") loadHistory();
}

/* ---------------- BANNER (max 3, diatur owner) ---------------- */
let bannerIndex = 0, bannerTimer = null;

async function loadBanners() {
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(3);

  const track = document.getElementById("bannerTrack");
  const dots = document.getElementById("bannerDots");
  track.innerHTML = ""; dots.innerHTML = "";

  const banners = (data && data.length) ? data : [
    { image_url: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=70" },
    { image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=70" },
    { image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=70" },
  ];

  banners.forEach((b, i) => {
    const slide = document.createElement("div");
    slide.className = "banner-slide";
    slide.innerHTML = `<img src="${b.image_url}" alt="banner"><div class="ov"></div>`;
    track.appendChild(slide);

    const dot = document.createElement("span");
    dot.className = i === 0 ? "active" : "";
    dot.onclick = () => goToBanner(i);
    dots.appendChild(dot);
  });

  if (banners.length > 1) {
    bannerTimer = setInterval(() => goToBanner((bannerIndex + 1) % banners.length), 4500);
  }
}

function goToBanner(i) {
  bannerIndex = i;
  document.getElementById("bannerTrack").style.transform = `translateX(-${i * 100}%)`;
  document.querySelectorAll("#bannerDots span").forEach((d, idx) => d.classList.toggle("active", idx === i));
}

/* ---------------- PRODUCTS ---------------- */
async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  allProducts = data || [];
  renderFlashSale();
  applyFilters();
}

function effectivePrice(p) {
  let price = p.price;
  if (p.is_flash_sale && p.flash_sale_price != null) price = p.flash_sale_price;
  else if (p.discount_percent > 0) price = price - (price * p.discount_percent / 100);

  if (currentProfile?.role === "reseller" && resellerDiscountPercent > 0) {
    price = price - (price * resellerDiscountPercent / 100);
  }
  return Math.max(0, Math.round(price));
}

function formatRp(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function renderFlashSale() {
  const flashItems = allProducts.filter(p => p.is_flash_sale && p.stock > 0);
  const wrap = document.getElementById("flashWrap");
  const track = document.getElementById("flashTrack");
  if (!flashItems.length) { wrap.style.display = "none"; return; }

  wrap.style.display = "block";
  track.innerHTML = flashItems.map(p => `
    <div class="flash-card">
      <img src="${p.image_url || placeholderImg()}" alt="${p.name}">
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="price-row">
        <span class="now">${formatRp(effectivePrice(p))}</span>
        <span class="old">${formatRp(p.price)}</span>
      </div>
    </div>
  `).join("");
}

function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const sort = document.getElementById("sortSelect").value;

  filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(q));

  if (sort === "asc") filteredProducts.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  if (sort === "desc") filteredProducts.sort((a, b) => effectivePrice(b) - effectivePrice(a));

  currentPage = 1;
  renderCatalog();
}

function renderCatalog() {
  const grid = document.getElementById("catalogGrid");
  const empty = document.getElementById("emptyState");
  const countLabel = document.getElementById("productCount");

  countLabel.textContent = `${filteredProducts.length} produk`;

  if (!filteredProducts.length) {
    grid.innerHTML = ""; empty.style.display = "block";
    document.getElementById("pagination").innerHTML = "";
    return;
  }
  empty.style.display = "none";

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const pageItems = filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);

  grid.innerHTML = pageItems.map(p => productCardHtml(p)).join("");
  renderPagination(totalPages);
}

function productCardHtml(p) {
  const price = effectivePrice(p);
  const hasDiscount = price < p.price;
  const stockClass = p.stock === 0 ? "out" : (p.stock <= 5 ? "low" : "");
  const stockLabel = p.stock === 0 ? "Stok habis" : `Stok: ${p.stock}`;

  return `
    <div class="product-card">
      ${hasDiscount ? `<div class="discount-tag">${p.is_flash_sale ? "FLASH SALE" : "-" + p.discount_percent + "%"}</div>` : ""}
      ${currentProfile?.role === "reseller" && resellerDiscountPercent > 0 ? `<div class="reseller-tag">RESELLER -${resellerDiscountPercent}%</div>` : ""}
      <div class="product-img"><img src="${p.image_url || placeholderImg()}" alt="${escapeHtml(p.name)}"></div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-desc">${escapeHtml(p.description || "")}</div>
        <div class="product-price-row">
          <span class="product-price">${formatRp(price)}</span>
          ${hasDiscount ? `<span class="product-price-old">${formatRp(p.price)}</span>` : ""}
        </div>
        <div class="product-stock ${stockClass}">${stockLabel}</div>
        <button class="buy-btn" ${p.stock === 0 ? "disabled" : ""} onclick="openCheckout('${p.id}')">
          ${p.stock === 0 ? "Stok habis" : "Beli sekarang"}
        </button>
      </div>
    </div>
  `;
}

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  if (totalPages <= 1) { el.innerHTML = ""; return; }
  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}
function goToPage(p) { currentPage = p; renderCatalog(); window.scrollTo({ top: 0, behavior: "smooth" }); }

/* ---------------- CHECKOUT (pop up 2 tahap) ---------------- */
const ADMIN_WHATSAPP = "6289541508402"; // 0895-4150-84082 dalam format internasional (tanpa + / 0 di depan)

let checkoutProduct = null;
let proofFile = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("checkoutCloseBtn").addEventListener("click", closeCheckout);
  document.getElementById("toStep2Btn").addEventListener("click", goToCheckoutStep2);
  document.getElementById("backToStep1Btn").addEventListener("click", goToCheckoutStep1);
  document.getElementById("confirmWaBtn").addEventListener("click", submitCheckout);

  document.getElementById("uploadBox").addEventListener("click", () => document.getElementById("proofInput").click());
  document.getElementById("proofInput").addEventListener("change", onProofSelected);

  document.getElementById("qrisImage").addEventListener("click", () => {
    document.getElementById("qrisLightbox").classList.add("show");
  });
  document.getElementById("qrisLightboxClose").addEventListener("click", () => {
    document.getElementById("qrisLightbox").classList.remove("show");
  });
  document.getElementById("qrisLightbox").addEventListener("click", (e) => {
    if (e.target.id === "qrisLightbox") e.target.classList.remove("show");
  });
});

// dipanggil dari tombol "Beli sekarang" pada kartu produk
function openCheckout(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;
  checkoutProduct = product;
  proofFile = null;

  // reset form
  document.getElementById("buyerName").value = "";
  document.getElementById("buyerWhatsapp").value = "";
  document.getElementById("proofInput").value = "";
  document.getElementById("proofPreview").style.display = "none";
  document.getElementById("uploadPlaceholder").style.display = "block";

  goToCheckoutStep1();
  document.getElementById("checkoutModal").classList.add("show");
}

function closeCheckout() {
  document.getElementById("checkoutModal").classList.remove("show");
}

function goToCheckoutStep1() {
  document.getElementById("checkoutStep1").classList.add("active");
  document.getElementById("checkoutStep2").classList.remove("active");
  document.getElementById("stepDot1").classList.add("active");
  document.getElementById("stepDot2").classList.remove("active");
  document.getElementById("checkoutTitle").textContent = "Form Pembeli";
}

function goToCheckoutStep2() {
  const name = document.getElementById("buyerName").value.trim();
  const wa = document.getElementById("buyerWhatsapp").value.trim();
  if (!name) { alert("Nama wajib diisi."); return; }
  if (!wa || wa.replace(/\D/g, "").length < 9) { alert("Nomor WhatsApp tidak valid."); return; }

  const price = effectivePrice(checkoutProduct);
  document.getElementById("checkoutProductSummary").innerHTML = `
    <img src="${checkoutProduct.image_url || placeholderImg()}" alt="">
    <div><b>${escapeHtml(checkoutProduct.name)}</b><span style="color:var(--ink-soft);">Qty 1</span></div>
  `;
  document.getElementById("checkoutAmount").textContent = formatRp(price);

  document.getElementById("checkoutStep1").classList.remove("active");
  document.getElementById("checkoutStep2").classList.add("active");
  document.getElementById("stepDot1").classList.remove("active");
  document.getElementById("stepDot2").classList.add("active");
  document.getElementById("checkoutTitle").textContent = "Pembayaran QRIS";
}

function onProofSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("File harus berupa gambar."); return; }
  if (file.size > 5 * 1024 * 1024) { alert("Ukuran gambar maksimal 5MB."); return; }

  proofFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("proofPreview").src = ev.target.result;
    document.getElementById("proofPreview").style.display = "block";
    document.getElementById("uploadPlaceholder").style.display = "none";
  };
  reader.readAsDataURL(file);
}

async function submitCheckout() {
  if (!proofFile) { alert("Lampirkan bukti transfer terlebih dahulu."); return; }

  const name = document.getElementById("buyerName").value.trim();
  const wa = document.getElementById("buyerWhatsapp").value.trim();
  const price = effectivePrice(checkoutProduct);
  const btn = document.getElementById("confirmWaBtn");

  btn.disabled = true; btn.textContent = "Mengunggah bukti transfer...";

  try {
    const fileExt = proofFile.name.split(".").pop();
    const filePath = `proofs/${currentUser.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage.from("images").upload(filePath, proofFile);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(filePath);
    const proofUrl = urlData.publicUrl;

    const { error: orderError } = await supabaseClient.from("orders").insert({
      user_id: currentUser.id,
      product_id: checkoutProduct.id,
      product_name: checkoutProduct.name,
      product_image: checkoutProduct.image_url,
      quantity: 1,
      price_paid: price,
      buyer_name: name,
      buyer_whatsapp: wa,
      proof_url: proofUrl,
      status: "pending",
    });
    if (orderError) throw orderError;

    // stok langsung dikurangi saat order dibuat (status pending);
    // dikembalikan otomatis oleh admin jika pesanan dibatalkan.
    await supabaseClient.from("products").update({ stock: checkoutProduct.stock - 1 }).eq("id", checkoutProduct.id);

    const waMessage = `Halo, saya ${name} ingin konfirmasi pembayaran:%0A` +
      `Produk: ${checkoutProduct.name}%0A` +
      `Total: ${formatRp(price)}%0A` +
      `Nomor WA saya: ${wa}%0A` +
      `Bukti transfer sudah saya unggah di sistem.`;

    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${waMessage}`, "_blank");

    closeCheckout();
    alert("Pesanan berhasil dibuat dengan status pending. Silakan selesaikan konfirmasi di WhatsApp.");
    await loadProducts();
  } catch (err) {
    alert("Gagal memproses pesanan: " + (err.message || err));
  } finally {
    btn.disabled = false; btn.textContent = "Lanjut & Konfirmasi via WhatsApp";
  }
}

/* ---------------- RIWAYAT ---------------- */
async function loadHistory() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  const list = document.getElementById("historyList");
  const empty = document.getElementById("historyEmpty");

  if (error || !data || !data.length) {
    list.innerHTML = ""; empty.style.display = "block"; return;
  }
  empty.style.display = "none";

  list.innerHTML = data.map(o => `
    <div class="history-item">
      <img src="${o.product_image || placeholderImg()}" alt="${escapeHtml(o.product_name)}">
      <div class="history-info">
        <div class="nm">${escapeHtml(o.product_name)}</div>
        <div class="meta">${new Date(o.created_at).toLocaleString("id-ID")} • Qty ${o.quantity} • ${formatRp(o.price_paid)}</div>
      </div>
      <div class="history-status ${o.status}">${escapeHtml(statusLabel(o.status))}</div>
    </div>
  `).join("");
}

/* ---------------- UTIL ---------------- */
function statusLabel(status) {
  return { pending: "Menunggu konfirmasi", selesai: "Selesai", dibatalkan: "Dibatalkan" }[status] || status;
}
function placeholderImg() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='%23EAF8EF'/></svg>`
  );
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
