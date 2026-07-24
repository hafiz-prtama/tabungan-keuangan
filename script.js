// ===== Data =====
let data = JSON.parse(localStorage.getItem('keuangan_data') || 'null');

if (!data) {
  data = {
    categories: [
      { id: cuid(), name: 'Uang Kas', transactions: [] },
      { id: cuid(), name: 'Uang Jajan', transactions: [] }
    ]
  };
}

// ===== Utilitas =====
function cuid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function simpan() {
  localStorage.setItem('keuangan_data', JSON.stringify(data));
}

function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// ===== Aksi Kategori =====
function tambahKategori() {
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();
  if (!name) {
    alert('Nama jenis tidak boleh kosong');
    return;
  }
  data.categories.push({ id: cuid(), name: name, transactions: [] });
  input.value = '';
  simpan();
  render();
}

function hapusKategori(catId) {
  if (!confirm('Hapus jenis ini beserta semua transaksinya?')) return;
  data.categories = data.categories.filter(c => c.id !== catId);
  simpan();
  render();
}

// ===== Aksi Transaksi =====
function tambahTransaksi(catId) {
  const desc = document.getElementById('desc_' + catId).value.trim();
  const amount = parseFloat(document.getElementById('amount_' + catId).value);
  const type = document.getElementById('type_' + catId).value;

  if (!desc) { alert('Isi keterangan transaksi'); return; }
  if (!amount || amount <= 0) { alert('Isi jumlah yang valid'); return; }

  const cat = data.categories.find(c => c.id === catId);
  cat.transactions.push({
    id: cuid(),
    desc: desc,
    amount: amount,
    type: type,
    date: new Date().toLocaleDateString('id-ID')
  });

  document.getElementById('desc_' + catId).value = '';
  document.getElementById('amount_' + catId).value = '';

  simpan();
  render();
}

function hapusTransaksi(catId, txnId) {
  const cat = data.categories.find(c => c.id === catId);
  cat.transactions = cat.transactions.filter(t => t.id !== txnId);
  simpan();
  render();
}

// ===== Perhitungan =====
function hitungTotalKategori(cat) {
  let masuk = 0, keluar = 0;
  cat.transactions.forEach(t => {
    if (t.type === 'masuk') masuk += t.amount;
    else keluar += t.amount;
  });
  return { masuk, keluar, saldo: masuk - keluar };
}

// ===== Render Tampilan =====
function render() {
  let grandMasuk = 0, grandKeluar = 0;
  const list = document.getElementById('categoryList');
  list.innerHTML = '';

  if (data.categories.length === 0) {
    list.innerHTML = '<div class="empty-msg">Belum ada jenis. Tambahkan jenis di atas.</div>';
  }

  data.categories.forEach(cat => {
    const totals = hitungTotalKategori(cat);
    grandMasuk += totals.masuk;
    grandKeluar += totals.keluar;

    const card = document.createElement('div');
    card.className = 'category-card';

    let rows = '';
    if (cat.transactions.length === 0) {
      rows = '<tr><td colspan="4" class="empty-msg">Belum ada transaksi</td></tr>';
    } else {
      cat.transactions.slice().reverse().forEach(t => {
        rows += `
          <tr>
            <td>${t.date}</td>
            <td>${t.desc}</td>
            <td class="${t.type === 'masuk' ? 'amount-in' : 'amount-out'}">
              ${t.type === 'masuk' ? '+' : '-'} ${formatRupiah(t.amount)}
            </td>
            <td><button class="del-txn" onclick="hapusTransaksi('${cat.id}','${t.id}')">✕</button></td>
          </tr>`;
      });
    }

    card.innerHTML = `
      <div class="cat-header">
        <h2>${cat.name}</h2>
        <div style="text-align:right;">
          <div class="cat-total" style="color: ${totals.saldo >= 0 ? '#16a34a' : '#dc2626'}">
            Saldo: ${formatRupiah(totals.saldo)}
          </div>
          <div style="font-size:11px; color:#6b7280;">
            Masuk: ${formatRupiah(totals.masuk)} &nbsp;|&nbsp; Keluar: ${formatRupiah(totals.keluar)}
          </div>
        </div>
      </div>

      <div class="txn-form">
        <select id="type_${cat.id}">
          <option value="masuk">Uang masuk</option>
          <option value="keluar">Uang Keluar</option>
        </select>
        <input type="text" id="desc_${cat.id}" placeholder="Keterangan">
        <input type="number" id="amount_${cat.id}" placeholder="Jumlah (Rp)">
        <button class="btn-primary btn-small" onclick="tambahTransaksi('${cat.id}')">Masukan</button>
        <button class="btn-danger btn-small" onclick="hapusKategori('${cat.id}')">Hapus</button>
      </div>

      <table>
        <thead>
          <tr><th>Tanggal</th><th>Keterangan</th><th>Jumlah</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    list.appendChild(card);
  });

  document.getElementById('totalMasuk').textContent = formatRupiah(grandMasuk);
  document.getElementById('totalKeluar').textContent = formatRupiah(grandKeluar);
  document.getElementById('totalSaldo').textContent = formatRupiah(grandMasuk - grandKeluar);
}

render();