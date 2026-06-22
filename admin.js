/* ===========================================================
   ADMIN PANEL — hanya dapat diakses oleh role 'admin'
=========================================================== */

let adminProducts = [];
let adminBanners = [];
let adminUsers = [];
let adminOrders = [];

document.addEventListener("DOMContentLoaded", initAdmin);

async function initAdmin() {
  const { data: sess } = await supabaseClient.auth.getSession();
  if (!sess?.session) { window.location.href = "index.html"; return; }

  const { data: profile, error } = await supabaseClient
    .from("profiles").select("*").eq("id", sess.session.user.id).single();

  if (error || !profile || profile.role !== "admin") {
    alert("Halaman ini hanya untuk admin.");
    window.location.href = "home.html";
    return;
  }

  await Promise.all([loadAdminProducts(), loadAdminBanners(), loadAdminUsers(), loadAdminOrders(), loadResellerDiscountSetting()]);
  refreshDashboardStats();

  document.getElementById("proofLightboxClose").addEventListener("click", () => {
    document.getElementById("proofLightbox").classList.remove("show");
  });
  document.getElementById("proofLightbox").addEventListener("click", (e) => {
    if (e.target.id === "proofLightbox") e.target.classList.remove("show");
  });
}

function logout() { supabaseClient.auth.signOut().then(() => window.location.href = "index.html"); }

function switchSection(sec) {
  document.querySelectorAll(".admin-link").forEach(l => l.classList.toggle("active", l.dataset.sec === sec));
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
  document.getElementById(`sec-${sec}`).classList.add("active");
}

function closeModal(id) { document.getElementById(id).classList.remove("show"); }
function openModalEl(id) { document.getElementById(id).classList.add("show"); }

function formatRp(n) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }

/* ================= DASHBOARD ================= */
function refreshDashboardStats() {
  document.getElementById("statProducts").textContent = adminProducts.length;
  document.getElementById("statUsers").textContent = adminUsers.length;
  document.getElementById("statResellers").textContent = adminUsers.filter(u => u.role === "reseller").length;
  document.getElementById("statOrders").textContent = adminOrders.length;
}

async function loadResellerDiscountSetting() {
  const { data } = await supabaseClient.from("settings").select("*").eq("key", "reseller_discount_percent").single();
  document.getElementById("resellerDiscountInput").value = data ? data.value : 0;
}
async function saveResellerDiscount() {
  const val = document.getElementById("resellerDiscountInput").value;
  const { error } = await supabaseClient.from("settings").upsert({ key: "reseller_discount_percent", value: String(val) });
  if (error) alert("Gagal menyimpan: " + error.message);
  else alert("Diskon reseller diperbarui menjadi " + val + "%.");
}

/* ================= PRODUCTS ================= */
async function loadAdminProducts() {
  const { data } = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
  adminProducts = data || [];
  renderProductsTable();
  renderFlashList();
}

function renderProductsTable() {
  const body = document.getElementById("productsTableBody");
  if (!adminProducts.length) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--ink-soft); padding:24px;">Belum ada produk.</td></tr>`;
    return;
  }
  body.innerHTML = adminProducts.map(p => `
    <tr>
      <td><b>${escapeHtml(p.name)}</b><div style="font-size:11.5px; color:var(--ink-soft);">${escapeHtml(p.description||"")}</div></td>
      <td>${formatRp(p.price)}</td>
      <td>${p.discount_percent > 0 ? p.discount_percent + "%" : "-"}</td>
      <td>${p.stock}</td>
      <td>${p.active ? "Aktif" : "Nonaktif"}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openProductModal('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
}

function openProductModal(id) {
  if (id) {
    const p = adminProducts.find(x => x.id === id);
    document.getElementById("productModalTitle").textContent = "Edit Produk";
    document.getElementById("productId").value = p.id;
    document.getElementById("productName").value = p.name;
    document.getElementById("productDesc").value = p.description || "";
    document.getElementById("productPrice").value = p.price;
    document.getElementById("productDiscount").value = p.discount_percent || 0;
    document.getElementById("productStock").value = p.stock;
    document.getElementById("productImage").value = p.image_url || "";
  } else {
    document.getElementById("productModalTitle").textContent = "Tambah Produk";
    ["productId","productName","productDesc","productPrice","productDiscount","productStock","productImage"]
      .forEach(f => document.getElementById(f).value = "");
    document.getElementById("productDiscount").value = 0;
  }
  openModalEl("productModal");
}

async function saveProduct() {
  const id = document.getElementById("productId").value;
  const payload = {
    name: document.getElementById("productName").value.trim(),
    description: document.getElementById("productDesc").value.trim(),
    price: parseFloat(document.getElementById("productPrice").value) || 0,
    discount_percent: parseFloat(document.getElementById("productDiscount").value) || 0,
    stock: parseInt(document.getElementById("productStock").value) || 0,
    image_url: document.getElementById("productImage").value.trim(),
  };
  if (!payload.name) { alert("Nama produk wajib diisi."); return; }

  const { error } = id
    ? await supabaseClient.from("products").update(payload).eq("id", id)
    : await supabaseClient.from("products").insert({ ...payload, active: true, is_flash_sale: false });

  if (error) { alert("Gagal menyimpan produk: " + error.message); return; }
  closeModal("productModal");
  await loadAdminProducts();
  refreshDashboardStats();
}

async function deleteProduct(id) {
  if (!confirm("Hapus produk ini?")) return;
  const { error } = await supabaseClient.from("products").delete().eq("id", id);
  if (error) { alert("Gagal menghapus: " + error.message); return; }
  await loadAdminProducts();
  refreshDashboardStats();
}

/* ================= FLASH SALE ================= */
function renderFlashList() {
  const wrap = document.getElementById("flashList");
  if (!adminProducts.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = adminProducts.map(p => `
    <div class="flash-admin-item">
      <img src="${p.image_url || ""}" alt="">
      <div class="grow">
        <b>${escapeHtml(p.name)}</b><br>
        <span style="color:var(--ink-soft);">Harga normal: ${formatRp(p.price)}</span>
      </div>
      <label style="display:flex; align-items:center; gap:6px; font-size:13px;">
        <input type="checkbox" ${p.is_flash_sale ? "checked" : ""} onchange="toggleFlashSale('${p.id}', this.checked)">
        Aktifkan
      </label>
      <div class="input-wrap" style="max-width:140px;">
        <input type="number" placeholder="Harga sale" value="${p.flash_sale_price || ""}" onblur="updateFlashPrice('${p.id}', this.value)">
      </div>
    </div>
  `).join("");
}

async function toggleFlashSale(id, checked) {
  const { error } = await supabaseClient.from("products").update({ is_flash_sale: checked }).eq("id", id);
  if (error) alert("Gagal mengubah status flash sale: " + error.message);
  await loadAdminProducts();
}
async function updateFlashPrice(id, value) {
  const price = parseFloat(value);
  if (isNaN(price)) return;
  const { error } = await supabaseClient.from("products").update({ flash_sale_price: price }).eq("id", id);
  if (error) alert("Gagal menyimpan harga flash sale: " + error.message);
  await loadAdminProducts();
}

/* ================= BANNERS ================= */
async function loadAdminBanners() {
  const { data } = await supabaseClient.from("banners").select("*").order("sort_order", { ascending: true });
  adminBanners = data || [];
  renderBannersList();
}

function renderBannersList() {
  const wrap = document.getElementById("bannersList");
  if (!adminBanners.length) {
    wrap.innerHTML = `<div class="empty-state">Belum ada banner. Tambahkan hingga 3 banner.</div>`;
    return;
  }
  wrap.innerHTML = adminBanners.map(b => `
    <div class="banner-admin-item">
      <img src="${b.image_url}" alt="">
      <div class="grow">Urutan: ${b.sort_order} • ${b.active ? "Aktif" : "Nonaktif"}</div>
      <button class="btn btn-ghost btn-sm" onclick="toggleBannerActive('${b.id}', ${!b.active})">${b.active ? "Nonaktifkan" : "Aktifkan"}</button>
      <button class="btn btn-danger btn-sm" onclick="deleteBanner('${b.id}')">Hapus</button>
    </div>
  `).join("");
}

function openBannerModal() {
  document.getElementById("bannerImage").value = "";
  document.getElementById("bannerOrder").value = adminBanners.length;
  openModalEl("bannerModal");
}

async function saveBanner() {
  if (adminBanners.length >= 3) { alert("Maksimal 3 banner aktif. Hapus salah satu terlebih dahulu."); return; }
  const image_url = document.getElementById("bannerImage").value.trim();
  const sort_order = parseInt(document.getElementById("bannerOrder").value) || 0;
  if (!image_url) { alert("URL gambar wajib diisi."); return; }

  const { error } = await supabaseClient.from("banners").insert({ image_url, sort_order, active: true });
  if (error) { alert("Gagal menambah banner: " + error.message); return; }
  closeModal("bannerModal");
  await loadAdminBanners();
}

async function toggleBannerActive(id, active) {
  const { error } = await supabaseClient.from("banners").update({ active }).eq("id", id);
  if (error) alert("Gagal mengubah status banner: " + error.message);
  await loadAdminBanners();
}
async function deleteBanner(id) {
  if (!confirm("Hapus banner ini?")) return;
  const { error } = await supabaseClient.from("banners").delete().eq("id", id);
  if (error) alert("Gagal menghapus banner: " + error.message);
  await loadAdminBanners();
}

/* ================= ORDERS / TRANSAKSI ================= */
async function loadAdminOrders() {
  const { data } = await supabaseClient.from("orders").select("*").order("created_at", { ascending: false });
  adminOrders = data || [];
  renderOrdersTable();
}

function renderOrdersTable() {
  const body = document.getElementById("ordersTableBody");
  if (!adminOrders.length) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--ink-soft); padding:24px;">Belum ada transaksi.</td></tr>`;
    return;
  }
  body.innerHTML = adminOrders.map(o => `
    <tr>
      <td><b>${escapeHtml(o.buyer_name || "-")}</b><div style="font-size:11.5px; color:var(--ink-soft);">${escapeHtml(o.buyer_whatsapp || "-")}</div></td>
      <td>${escapeHtml(o.product_name)}</td>
      <td>${formatRp(o.price_paid)}</td>
      <td>${o.proof_url ? `<img src="${o.proof_url}" class="order-proof-thumb" onclick="openProofLightbox('${o.proof_url}')">` : "-"}</td>
      <td><span class="status-badge ${o.status}">${o.status}</span></td>
      <td>
        <select class="status-select" onchange="changeOrderStatus('${o.id}', this.value)">
          <option value="pending" ${o.status==="pending"?"selected":""}>pending</option>
          <option value="selesai" ${o.status==="selesai"?"selected":""}>selesai</option>
          <option value="dibatalkan" ${o.status==="dibatalkan"?"selected":""}>dibatalkan</option>
        </select>
      </td>
    </tr>
  `).join("");
}

function openProofLightbox(url) {
  document.getElementById("proofLightboxImg").src = url;
  document.getElementById("proofLightbox").classList.add("show");
}

async function changeOrderStatus(orderId, newStatus) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;
  const oldStatus = order.status;
  if (oldStatus === newStatus) return;

  const { error } = await supabaseClient.from("orders").update({ status: newStatus }).eq("id", orderId);
  if (error) { alert("Gagal mengubah status: " + error.message); await loadAdminOrders(); return; }

  // kembalikan stok otomatis saat pesanan dibatalkan (sekali saja),
  // dan kurangi lagi stok kalau pembatalan dibatalkan balik (jarang terjadi, untuk konsistensi).
  if (order.product_id) {
    const { data: productRow } = await supabaseClient.from("products").select("stock").eq("id", order.product_id).single();
    if (productRow) {
      if (newStatus === "dibatalkan" && oldStatus !== "dibatalkan") {
        await supabaseClient.from("products").update({ stock: productRow.stock + order.quantity }).eq("id", order.product_id);
      } else if (oldStatus === "dibatalkan" && newStatus !== "dibatalkan") {
        await supabaseClient.from("products").update({ stock: Math.max(0, productRow.stock - order.quantity) }).eq("id", order.product_id);
      }
    }
  }

  await loadAdminOrders();
  await loadAdminProducts();
  refreshDashboardStats();
}

/* ================= USERS / ROLES ================= */
async function loadAdminUsers() {
  const { data } = await supabaseClient.from("profiles").select("*").order("created_at", { ascending: false });
  adminUsers = data || [];
  renderUsersTable();
}

function renderUsersTable() {
  const body = document.getElementById("usersTableBody");
  if (!adminUsers.length) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--ink-soft); padding:24px;">Belum ada pengguna.</td></tr>`;
    return;
  }
  body.innerHTML = adminUsers.map(u => `
    <tr>
      <td><b>${escapeHtml(u.username)}</b></td>
      <td>${new Date(u.created_at).toLocaleDateString("id-ID")}</td>
      <td><span class="role-badge ${u.role}">${u.role}</span></td>
      <td>
        <select class="role-select" onchange="changeUserRole('${u.id}', this.value)">
          <option value="user" ${u.role==="user"?"selected":""}>user</option>
          <option value="admin" ${u.role==="admin"?"selected":""}>admin</option>
          <option value="reseller" ${u.role==="reseller"?"selected":""}>reseller</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function changeUserRole(id, role) {
  const { error } = await supabaseClient.from("profiles").update({ role }).eq("id", id);
  if (error) { alert("Gagal mengubah role: " + error.message); return; }
  await loadAdminUsers();
  refreshDashboardStats();
}

/* ================= UTIL ================= */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
