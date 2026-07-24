// =========================================================
// PENYIMPANAN: localStorage, key SAMA dengan script.js
// ('keuangan_data') supaya Celengan & Keuangan nyambung.
//
// PENTING: struktur data mengikuti script.js kamu, yaitu
// transaksi disimpan DI DALAM tiap kategori:
//   data.categories = [ { id, name, transactions: [...] } ]
// Sedangkan celengan & riwayat tabungan disimpan terpisah:
//   data.celengan = [ { id, namaBarang, hargaTarget } ]
//   data.tabunganLog = [ { id, celenganId, kategoriId, jumlah, tanggal } ]
// =========================================================
const STORAGE_KEY = 'keuangan_data';

let data = muatDariStorage();

function muatDariStorage() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');

  if (raw) {
    // pertahankan categories & transactions apa adanya (nested),
    // cuma pastikan celengan & tabunganLog ada
    return {
      categories: raw.categories || [],
      celengan: raw.celengan || [],
      tabunganLog: raw.tabunganLog || []
    };
  }

  // data awal kalau belum ada sama sekali (fallback)
  return {
    categories: [
      { id: cuid(), name: 'Uang Kas', transactions: [] },
      { id: cuid(), name: 'Uang Jajan', transactions: [] }
    ],
    celengan: [],
    tabunganLog: []
  };
}

function simpan() {
  // ambil data keuangan TERBARU dari localStorage dulu (kalau ada
  // perubahan dari halaman Keuangan di tab lain), lalu timpa cuma
  // bagian celengan & tabunganLog + categories yang sudah diupdate
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {};
  current.categories = data.categories;
  current.celengan = data.celengan;
  current.tabunganLog = data.tabunganLog;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

// ===== Utilitas =====
function cuid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// ===== Aksi Celengan =====
function tambahCelengan() {
  const namaInput = document.getElementById('namaBarang');
  const hargaInput = document.getElementById('hargaTarget');
  const namaBarang = namaInput.value.trim();
  const hargaTarget = parseFloat(hargaInput.value);

  if (!namaBarang) { alert('Isi nama barang'); return; }
  if (!hargaTarget || hargaTarget <= 0) { alert('Isi harga target yang valid'); return; }

  data.celengan.push({ id: cuid(), namaBarang: namaBarang, hargaTarget: hargaTarget });

  namaInput.value = '';
  hargaInput.value = '';

  simpan();
  render();
}

function hapusCelengan(celenganId) {
  if (!confirm('Hapus tujuan tabungan ini? Riwayat menabungnya juga akan hilang (catatan pengeluaran di halaman Keuangan tetap ada).')) return;
  data.celengan = data.celengan.filter(c => c.id !== celenganId);
  data.tabunganLog = data.tabunganLog.filter(t => t.celenganId !== celenganId);
  simpan();
  render();
}

// ===== Aksi Menabung =====
function tambahTabungan(celenganId) {
  const jumlah = parseFloat(document.getElementById('jumlah_' + celenganId).value);
  const kategoriId = document.getElementById('sumber_' + celenganId).value;

  if (!jumlah || jumlah <= 0) { alert('Isi jumlah nabung yang valid'); return; }
  if (!kategoriId) { alert('Pilih sumber dana (kategori keuangan)'); return; }
  if (data.categories.length === 0) {
    alert('Belum ada kategori keuangan. Buat dulu kategori di halaman Keuangan.');
    return;
  }

  const cel = data.celengan.find(c => c.id === celenganId);
  const cat = data.categories.find(c => c.id === kategoriId);
  if (!cat) { alert('Kategori tidak ditemukan'); return; }

  const tanggal = new Date().toLocaleDateString('id-ID');

  // 1. catat di log tabungan (buat hitung progress celengan)
  data.tabunganLog.push({
    id: cuid(),
    celenganId: celenganId,
    kategoriId: kategoriId,
    jumlah: jumlah,
    tanggal: tanggal
  });

  // 2. catat juga sebagai pengeluaran DI DALAM kategori terkait
  //    (supaya muncul di halaman Keuangan, sama seperti transaksi biasa)
  if (!cat.transactions) cat.transactions = [];
  cat.transactions.push({
    id: cuid(),
    desc: 'Menabung: ' + (cel ? cel.namaBarang : ''),
    amount: jumlah,
    type: 'keluar',
    date: tanggal
  });

  document.getElementById('jumlah_' + celenganId).value = '';

  simpan();
  render();
}

// ===== Perhitungan =====
function hitungTerkumpul(celenganId) {
  return data.tabunganLog
    .filter(t => t.celenganId === celenganId)
    .reduce((sum, t) => sum + t.jumlah, 0);
}

// ===== Render =====
function render() {
  const list = document.getElementById('celenganList');
  list.innerHTML = '';

  if (data.celengan.length === 0) {
    list.innerHTML = '<div class="empty-msg">Belum ada tujuan tabungan. Buat dulu di atas.</div>';
    return;
  }

  const optionsKategori = data.categories
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join('');

  data.celengan.forEach(cel => {
    const terkumpul = hitungTerkumpul(cel.id);
    const persen = Math.min(100, (terkumpul / cel.hargaTarget) * 100);
    const sisa = Math.max(0, cel.hargaTarget - terkumpul);
    const lunas = terkumpul >= cel.hargaTarget;

    const logCelengan = data.tabunganLog
      .filter(t => t.celenganId === cel.id)
      .slice()
      .reverse();

    let riwayat = '';
    if (logCelengan.length === 0) {
      riwayat = '<div class="empty-msg">Belum ada riwayat menabung</div>';
    } else {
      riwayat = '<table><thead><tr><th>Tanggal</th><th>Jumlah</th></tr></thead><tbody>' +
        logCelengan.map(t => `<tr><td>${t.tanggal}</td><td class="amount-in">+ ${formatRupiah(t.jumlah)}</td></tr>`).join('') +
        '</tbody></table>';
    }

    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="cat-header">
        <h2>${cel.namaBarang} ${lunas ? '🎉' : ''}</h2>
        <button class="btn-danger btn-small" onclick="hapusCelengan('${cel.id}')">Hapus</button>
      </div>

      <div class="progress-info">
        <span>${formatRupiah(terkumpul)} / ${formatRupiah(cel.hargaTarget)}</span>
        <span>${persen.toFixed(0)}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${persen}%; background:${lunas ? '#16a34a' : '#2563eb'}"></div>
      </div>
      <div class="empty-msg" style="text-align:left; padding:4px 0;">
        ${lunas ? 'Target tercapai! Saatnya belanja 🎉' : 'Kurang ' + formatRupiah(sisa) + ' lagi'}
      </div>

      ${!lunas ? `
      <div class="txn-form">
        <select id="sumber_${cel.id}">
          <option value="">Sumber dana...</option>
          ${optionsKategori}
        </select>
        <input type="number" id="jumlah_${cel.id}" placeholder="Jumlah nabung (Rp)">
        <button class="btn-primary btn-small" onclick="tambahTabungan('${cel.id}')">Nabung</button>
      </div>` : ''}

      <details>
        <summary style="cursor:pointer; font-size:12px; color:#6b7280;">Riwayat menabung</summary>
        ${riwayat}
      </details>
    `;

    list.appendChild(card);
  });
}

render();