/* =============================================================== */
/* STATE                                                            */
/* =============================================================== */
let groupIdCounter = 0;
let rowIdCounter = 0;

function makeRow(jumlah, panjang, diameter, volume) {
  rowIdCounter += 1;
  return { id: 'r' + rowIdCounter, jumlah, panjang, diameter, volume };
}

function makeGroup(nama, rows) {
  groupIdCounter += 1;
  return { id: 'g' + groupIdCounter, nama, rows };
}

// Data awal diubah menjadi kosong agar user bisa mengisi manual
let groups = [
  makeGroup('', [
    makeRow('', '', '', '')
  ]),
];

/* =============================================================== */
/* HELPERS                                                          */
/* =============================================================== */
function formatID(num, maxDecimals) {
  if (maxDecimals === undefined) maxDecimals = 3;
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID', { maximumFractionDigits: maxDecimals });
}

function parseNum(val) {
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatTanggalIndo(dateObj) {
  return `${dateObj.getDate()} ${BULAN_ID[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function formatDateRange(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `Dari Tanggal : ${start.getDate()} s/d ${end.getDate()} ${BULAN_ID[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `Dari Tanggal : ${formatTanggalIndo(start)} s/d ${formatTanggalIndo(end)}`;
}

/* =============================================================== */
/* AUTO-HITUNG VOLUME                                               */
/* Jika diameter berformat "t x l" (mis. "2,5 x 10") -> kayu gergajian */
/* Jika diameter angka tunggal -> kayu bulat (silinder)             */
/* =============================================================== */
function autoCalcVolume(jumlah, panjang, diameterStr) {
  const j = parseNum(jumlah);
  const p = parseNum(panjang);
  if (!diameterStr) return 0;
  if (String(diameterStr).toLowerCase().includes('x')) {
    const parts = String(diameterStr).toLowerCase().split('x').map(s => parseNum(s));
    if (parts.length < 2) return 0;
    const tebalM = parts[0] / 100;
    const lebarM = parts[1] / 100;
    return j * p * tebalM * lebarM;
  }
  const d = parseNum(diameterStr);
  const rM = (d / 100) / 2;
  return j * p * Math.PI * rM * rM;
}

/* =============================================================== */
/* RENDER: FORM EDITOR GRUP/BARIS                                  */
/* =============================================================== */
const groupsContainer = document.getElementById('groupsContainer');

function renderGroups() {
  groupsContainer.innerHTML = '';

  groups.forEach((group, gIndex) => {
    const block = document.createElement('div');
    block.className = 'group-block-new';
    block.style.marginBottom = '24px';
    block.style.paddingBottom = '16px';
    block.style.borderBottom = '1px solid var(--border)';

    /* ---- Header ---- */
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.marginBottom = '16px';

    const badge = document.createElement('span');
    badge.className = 'group-badge';
    badge.textContent = `#${gIndex + 1}`;

    const namaInput = document.createElement('input');
    namaInput.type = 'text';
    namaInput.className = 'group-nama-input';
    namaInput.placeholder = 'Nama jenis kayu…';
    namaInput.value = group.nama;
    namaInput.addEventListener('input', (e) => {
      group.nama = e.target.value;
      updateTotalsPreview();
    });

    const removeGroupBtn = document.createElement('button');
    removeGroupBtn.type = 'button';
    removeGroupBtn.className = 'btn btn--danger';
    removeGroupBtn.title = 'Hapus jenis kayu ini';
    removeGroupBtn.style.padding = '5px 8px';
    removeGroupBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M4 5h12M7 5V3h6v2M6 5l.8 11h6.4L14 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    removeGroupBtn.addEventListener('click', () => {
      groups = groups.filter(g => g.id !== group.id);
      renderGroups();
      updateTotalsPreview();
    });

    header.appendChild(badge);
    header.appendChild(namaInput);
    header.appendChild(removeGroupBtn);
    block.appendChild(header);

    /* ---- Tabel sub-baris ---- */
    const tableWrap = document.createElement('div');
    tableWrap.className = 'rows-container';

    group.rows.forEach((row, rIndex) => {
      tableWrap.appendChild(renderSubrow(group, row, rIndex));
    });
    block.appendChild(tableWrap);

    /* ---- Tombol Tambah Baris ---- */
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'btn btn--secondary';
    addRowBtn.style.marginTop = '12px';
    addRowBtn.innerHTML = `+ Tambah Ukuran`;
    addRowBtn.addEventListener('click', () => {
      group.rows.push(makeRow('', '', '', ''));
      renderGroups();
      updateTotalsPreview();
    });
    block.appendChild(addRowBtn);

    /* ---- Subtotal ---- */
    const { totalJumlah, totalVolume } = computeGroupTotals(group);
    const subtotal = document.createElement('div');
    subtotal.className = 'group-subtotal';
    subtotal.style.marginTop = '12px';
    subtotal.style.borderRadius = '8px';
    subtotal.innerHTML = buildSubtotalHTML(totalJumlah, totalVolume);
    block.appendChild(subtotal);

    groupsContainer.appendChild(block);
  });
}

function buildSubtotalHTML(totalJumlah, totalVolume) {
  const satuanEl = document.getElementById('satuanGrand');
  const satuan = satuanEl?.selectedOptions?.[0]?.text?.split(' ')[0]?.trim() || satuanEl?.value?.trim() || 'Btg';
  return `
    <span class="subtotal-item">
      <span class="subtotal-label">Subtotal</span>
      <span class="subtotal-val">${formatID(totalJumlah, 0)} ${satuan}</span>
    </span>
    <span class="subtotal-sep">·</span>
    <span class="subtotal-item">
      <span class="subtotal-label">Volume</span>
      <span class="subtotal-val">${formatID(totalVolume, 3)} m³</span>
    </span>`;
}

function renderSubrow(group, row, rIndex) {
  const wrap = document.createElement('div');
  wrap.className = 'row-item';

  const header = document.createElement('div');
  header.className = 'row-item-header';

  const title = document.createElement('div');
  title.className = 'row-item-title';
  title.textContent = `Ukuran #${rIndex + 1}`;

  const removeLabel = document.createElement('div');
  removeLabel.className = 'row-delete-label';
  removeLabel.textContent = 'Hapus';
  removeLabel.addEventListener('click', () => {
    group.rows = group.rows.filter(r => r.id !== row.id);
    renderGroups();
    updateTotalsPreview();
  });

  header.appendChild(title);
  header.appendChild(removeLabel);
  wrap.appendChild(header);

  function field(labelText, inputEl) {
    const f = document.createElement('div');
    f.className = 'row-field';
    const l = document.createElement('label');
    l.textContent = labelText;
    f.appendChild(l);
    f.appendChild(inputEl);
    return f;
  }

  /* Jumlah */
  const jumlahInput = document.createElement('input');
  jumlahInput.type = 'number';
  jumlahInput.placeholder = '0';
  jumlahInput.value = row.jumlah;
  jumlahInput.addEventListener('input', (e) => {
    row.jumlah = e.target.value;
    updateTotalsPreview();
    refreshSubtotal(group);
  });

  /* Panjang */
  const panjangInput = document.createElement('input');
  panjangInput.type = 'number';
  panjangInput.placeholder = '0';
  panjangInput.value = row.panjang;
  panjangInput.addEventListener('input', (e) => {
    row.panjang = e.target.value;
    updateTotalsPreview();
    refreshSubtotal(group);
  });

  /* Diameter */
  const diameterInput = document.createElement('input');
  diameterInput.type = 'text';
  diameterInput.placeholder = '2,5 × 10';
  diameterInput.value = row.diameter;
  diameterInput.addEventListener('input', (e) => { row.diameter = e.target.value; });

  /* Volume */
  const volumeInput = document.createElement('input');
  volumeInput.type = 'number';
  volumeInput.step = '0.001';
  volumeInput.placeholder = '0';
  volumeInput.value = row.volume;
  volumeInput.title = 'Ketuk dua kali untuk hitung otomatis';
  volumeInput.addEventListener('input', (e) => {
    row.volume = e.target.value;
    updateTotalsPreview();
    refreshSubtotal(group);
  });
  volumeInput.addEventListener('dblclick', () => {
    const v = autoCalcVolume(row.jumlah, row.panjang, row.diameter);
    row.volume = Math.round(v * 1000) / 1000;
    volumeInput.value = row.volume;
    updateTotalsPreview();
    refreshSubtotal(group);
  });

  wrap.appendChild(field('Jumlah', jumlahInput));
  wrap.appendChild(field('Panjang (cm)', panjangInput));
  wrap.appendChild(field('Diameter (cm)', diameterInput));
  wrap.appendChild(field('Volume (m³)', volumeInput));

  return wrap;
}

/* Update subtotal satu grup tanpa re-render seluruh list */
function refreshSubtotal(group) {
  const blocks = groupsContainer.querySelectorAll('.group-block-new');
  const idx = groups.indexOf(group);
  if (idx < 0 || !blocks[idx]) return;
  const subtotalEl = blocks[idx].querySelector('.group-subtotal');
  if (!subtotalEl) return;
  const { totalJumlah, totalVolume } = computeGroupTotals(group);
  subtotalEl.innerHTML = buildSubtotalHTML(totalJumlah, totalVolume);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* =============================================================== */
/* TOTALS                                                           */
/* =============================================================== */
function computeGroupTotals(group) {
  let totalJumlah = 0;
  let totalVolume = 0;
  group.rows.forEach(r => {
    totalJumlah += parseNum(r.jumlah);
    totalVolume += parseNum(r.volume);
  });
  return { totalJumlah, totalVolume };
}

function computeGrandTotals() {
  let totalJumlah = 0;
  let totalVolume = 0;
  groups.forEach(g => {
    const t = computeGroupTotals(g);
    totalJumlah += t.totalJumlah;
    totalVolume += t.totalVolume;
  });
  return { totalJumlah, totalVolume };
}

function updateTotalsPreview() {
  const { totalJumlah, totalVolume } = computeGrandTotals();
  document.getElementById('totalJumlahPreview').textContent = formatID(totalJumlah, 0);
  document.getElementById('totalVolumePreview').textContent = formatID(totalVolume, 3);
}

/* =============================================================== */
/* AUTO-SAVE (localStorage)                                         */
/* =============================================================== */
const SAVE_KEY_DK = 'dkbdko_autosave';
const FORM_FIELD_IDS_DK = ['nomor','kabkota','provinsi','satuanSub','satuanGrand','tglMulai','tglAkhir','jenisAngkut','noPolisi','kotaTtd','tanggalTtd','namaPemilik'];

function saveData() {
  try {
    const formData = {};
    FORM_FIELD_IDS_DK.forEach(id => {
      const el = document.getElementById(id);
      if (el) formData[id] = el.value;
    });
    const signatureDataUrl = hasSignature ? canvas.toDataURL('image/png') : null;
    const payload = { formData, groups, signatureDataUrl, savedAt: new Date().toISOString() };
    localStorage.setItem(SAVE_KEY_DK, JSON.stringify(payload));
  } catch(e) { /* quota exceeded, ignore */ }
}

function loadData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY_DK);
    if (!raw) return false;
    const payload = JSON.parse(raw);

    // Restore form fields
    if (payload.formData) {
      FORM_FIELD_IDS_DK.forEach(id => {
        const el = document.getElementById(id);
        if (el && payload.formData[id] !== undefined) el.value = payload.formData[id];
      });
    }

    // Restore groups data
    if (payload.groups && Array.isArray(payload.groups)) {
      groupIdCounter = 0;
      rowIdCounter = 0;
      groups = payload.groups.map(g => {
        groupIdCounter++;
        return {
          id: 'g' + groupIdCounter,
          nama: g.nama || '',
          rows: (g.rows || []).map(r => {
            rowIdCounter++;
            return { id: 'r' + rowIdCounter, jumlah: r.jumlah || '', panjang: r.panjang || '', diameter: r.diameter || '', volume: r.volume || '' };
          })
        };
      });
      if (groups.length === 0) {
        groups = [makeGroup('', [makeRow('', '', '', '')])];
      }
    }

    // Restore signature
    if (payload.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        resizeCanvas();
        ctx.drawImage(img, 0, 0, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
        hasSignature = true;
      };
      img.src = payload.signatureDataUrl;
    }

    return true;
  } catch(e) { return false; }
}

/* =============================================================== */
/* TAMBAH JENIS KAYU BARU                                           */
/* =============================================================== */
document.getElementById('addGroupBtn').addEventListener('click', () => {
  groups.push(makeGroup('', [makeRow('', '', '', '')]));
  renderGroups();
  updateTotalsPreview();
  saveData();
});

// Ketika satuan grand total diubah, refresh semua subtotal yang tampil
document.getElementById('satuanGrand').addEventListener('input', () => {
  groups.forEach(group => refreshSubtotal(group));
  saveData();
});

/* =============================================================== */
/* SIGNATURE PAD                                                    */
/* =============================================================== */
const canvas = document.getElementById('signaturePad');
const ctx = canvas.getContext('2d');
let drawing = false;
let hasSignature = false;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a1a2e';
}
window.addEventListener('resize', () => {
  const dataUrl = hasSignature ? canvas.toDataURL() : null;
  resizeCanvas();
  if (dataUrl) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
    img.src = dataUrl;
  }
});
resizeCanvas();

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDraw(e) {
  drawing = true;
  hasSignature = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  e.preventDefault();
}
function moveDraw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  e.preventDefault();
}
function endDraw(e) {
  drawing = false;
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', moveDraw, { passive: false });
canvas.addEventListener('touchend', endDraw);

document.getElementById('clearSignBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
});

/* =============================================================== */
/* GENERATE PDF                                                     */
/* =============================================================== */
const form = document.getElementById('dkbForm');

/* --- Modal helpers --- */
const toast = document.getElementById('validationToast');
const toastList = document.getElementById('toastList');
const toastClose = document.getElementById('toastCloseBtn');
const overlay = document.getElementById('valOverlay');
let toastTimer = null;

function showToast(errors) {
  toastList.innerHTML = errors.map((e, i) =>
    `<li style="animation-delay:${i * 0.05}s">${e}</li>`
  ).join('');
  overlay.classList.add('val-overlay--show');
  toast.classList.add('val-toast--show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 7000);
}

function hideToast() {
  toast.classList.remove('val-toast--show');
  overlay.classList.remove('val-overlay--show');
  clearTimeout(toastTimer);
}

toastClose.addEventListener('click', hideToast);
overlay.addEventListener('click', hideToast);

function buildPrintArea(isMentah = false, mentahJenis = 5, mentahUkuran = 3) {
  const nomor = document.getElementById('nomor').value.trim();
  const kabkota = document.getElementById('kabkota').value.trim();
  const provinsi = document.getElementById('provinsi').value.trim();
  const satuanSub = document.getElementById('satuanSub').value.trim() || 'Pcs';
  const satuanGrand = document.getElementById('satuanGrand').value.trim() || 'Btg';
  const jenisAngkut = document.getElementById('jenisAngkut').value.trim();
  const noPolisi = document.getElementById('noPolisi').value.trim();
  const namaPemilik = document.getElementById('namaPemilik').value.trim();
  const tglMulai = document.getElementById('tglMulai').value;
  const tglAkhir = document.getElementById('tglAkhir').value;

  if (isMentah) {
    document.getElementById('pv_nomor').innerHTML = `Nomor &nbsp;&nbsp;: <span style="display:inline-block; width:120px; vertical-align:bottom;"></span>`;
    document.getElementById('pv_kabkota').textContent = ``;
    document.getElementById('pv_provinsi').textContent = ``;
    document.getElementById('pv_jenisAngkut').textContent = ``;
    document.getElementById('pv_noPolisi').textContent = ``;
    document.getElementById('pv_namaPemilik').textContent = ``;
    document.getElementById('pv_tanggalRange').innerHTML = `<br>`;
    document.getElementById('pv_kotaTanggal').textContent = ``;
    document.getElementById('pv_signatureImg').src = '';
  } else {
    document.getElementById('pv_nomor').innerHTML = `Nomor &nbsp;&nbsp;: ${escapeHtml(nomor)}<span style="display:inline-block; width:120px; vertical-align:bottom;"></span>`;
    document.getElementById('pv_kabkota').textContent = kabkota;
    document.getElementById('pv_provinsi').textContent = provinsi;
    document.getElementById('pv_jenisAngkut').textContent = jenisAngkut;
    document.getElementById('pv_noPolisi').textContent = noPolisi;
    document.getElementById('pv_namaPemilik').textContent = namaPemilik;
    document.getElementById('pv_tanggalRange').textContent = formatDateRange(tglMulai, tglAkhir);

    const tanggalTtdVal = document.getElementById('tanggalTtd')?.value;
    const tanggalTtdObj = tanggalTtdVal ? new Date(tanggalTtdVal + 'T00:00:00') : new Date();
    document.getElementById('pv_kotaTanggal').textContent = `${kabkota}, ${formatTanggalIndo(tanggalTtdObj)}`;

    if (hasSignature) {
      document.getElementById('pv_signatureImg').src = canvas.toDataURL('image/png');
    } else {
      document.getElementById('pv_signatureImg').src = '';
    }
  }
  // Build table body
  const tbody = document.getElementById('pv_tbody');
  tbody.innerHTML = '';

  if (isMentah) {
    // jenisCount kelompok, masing-masing ukuranCount baris kosong
    for (let i = 0; i < mentahJenis; i++) {
      for (let j = 0; j < mentahUkuran; j++) {
        const tr = document.createElement('tr');
        if (j === 0) {
          tr.innerHTML = `
            <td class="col-no mentah-cell" rowspan="${mentahUkuran}" style="vertical-align: middle; text-align: center;">${i + 1}</td>
            <td class="col-jenis group-name-cell mentah-cell" rowspan="${mentahUkuran}"></td>
            <td class="col-jumlah mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
            <td class="col-panjang mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
            <td class="col-diameter mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
            <td class="col-volume mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
          `;
        } else {
          tr.innerHTML = `
            <td class="col-jumlah mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
            <td class="col-panjang mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
            <td class="col-diameter mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
            <td class="col-volume mentah-cell"><div class="mentah-row-spacer">&nbsp;</div></td>
          `;
        }
        tbody.appendChild(tr);
      }
    }
    document.getElementById('pv_footJumlah').textContent = ``;
    document.getElementById('pv_footVolume').textContent = ``;
  } else {
    groups.forEach((group, gIndex) => {
      const { totalJumlah, totalVolume } = computeGroupTotals(group);

      const jumlahLines = group.rows.map(r => {
        const val = r.jumlah === '' || r.jumlah === null || r.jumlah === undefined ? '' : formatID(parseNum(r.jumlah), 0);
        return `<div class="stack-line">${val}</div>`;
      }).join('');
      const panjangLines = group.rows.map(r => {
        const val = r.panjang === '' || r.panjang === null || r.panjang === undefined ? '' : formatID(parseNum(r.panjang), 0);
        return `<div class="stack-line">${val}</div>`;
      }).join('') + `<div class="stack-line">&nbsp;</div>`;
      const diameterLines = group.rows.map(r => {
        const val = r.diameter === '' || r.diameter === null || r.diameter === undefined ? '' : escapeHtml(r.diameter);
        return `<div class="stack-line">${val}</div>`;
      }).join('') + `<div class="stack-line">&nbsp;</div>`;
      const volumeLines = group.rows.map(r => {
        const val = r.volume === '' || r.volume === null || r.volume === undefined ? '' : formatID(parseNum(r.volume), 3);
        return `<div class="stack-line">${val}</div>`;
      }).join('');

      // Cek apakah semua row di grup ini kosong (tidak diisi user)
      const isGroupEmpty = group.rows.every(r =>
        (r.jumlah === '' || r.jumlah === null || r.jumlah === undefined) &&
        (r.panjang === '' || r.panjang === null || r.panjang === undefined) &&
        (r.diameter === '' || r.diameter === null || r.diameter === undefined) &&
        (r.volume === '' || r.volume === null || r.volume === undefined)
      );

      const subtotalJumlah = isGroupEmpty ? '' : `<div class="stack-line bold">${formatID(totalJumlah, 0)} ${escapeHtml(satuanSub)}</div>`;
      const subtotalVolume = isGroupEmpty ? '' : `<div class="stack-line bold">${formatID(totalVolume, 3)} M&sup3;</div>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-no">${gIndex + 1}</td>
        <td class="col-jenis group-name-cell">${escapeHtml(group.nama)}</td>
        <td class="col-jumlah">${jumlahLines}${subtotalJumlah}</td>
        <td class="col-panjang">${panjangLines}</td>
        <td class="col-diameter">${diameterLines}</td>
        <td class="col-volume">${volumeLines}${subtotalVolume}</td>
      `;
      tbody.appendChild(tr);
    });

    const grand = computeGrandTotals();
    // Jika grand total = 0 (semua kosong), tampilkan kosong
    const allEmpty = groups.every(g => g.rows.every(r =>
      (r.jumlah === '' || r.jumlah === null || r.jumlah === undefined) &&
      (r.volume === '' || r.volume === null || r.volume === undefined)
    ));
    document.getElementById('pv_footJumlah').textContent = allEmpty ? '' : `${formatID(grand.totalJumlah, 0)} ${satuanGrand}`;
    document.getElementById('pv_footVolume').textContent = allEmpty ? '' : `${formatID(grand.totalVolume, 3)} M³`;
  }
}

const REQUIRED_FIELDS = [
  { id: 'nomor', label: 'Nomor' },
  { id: 'kabkota', label: 'Kabupaten/Kota' },
  { id: 'provinsi', label: 'Provinsi' },
  { id: 'tglMulai', label: 'Dari Tanggal' },
  { id: 'tglAkhir', label: 'Sampai Tanggal' },
  { id: 'jenisAngkut', label: 'Jenis Alat Angkut' },
  { id: 'noPolisi', label: 'No. Polisi' },
  { id: 'namaPemilik', label: 'Nama Pemilik Hutan Hak' },
];

function validateForm() {
  const errors = [];

  for (const { id, label } of REQUIRED_FIELDS) {
    const el = document.getElementById(id);
    if (!el || !el.value || !el.value.trim()) {
      errors.push(label);
    }
  }

  if (groups.length === 0 || groups.every(g => g.rows.length === 0)) {
    errors.push('Minimal 1 baris Daftar Jenis Kayu harus diisi');
  } else {
    for (const g of groups) {
      if (!g.nama || !g.nama.trim()) {
        errors.push('Nama jenis kayu belum diisi');
        break;
      }
    }
  }

  return errors; // array kosong = valid
}


form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const errors = validateForm();
  if (errors.length > 0) {
    showToast(errors);
    return;
  }

  await generatePDF(false);
});

// --- Mentah Modal ---
const mentahModal = document.getElementById('mentahModal');
const mentahOverlay = document.getElementById('mentahOverlay');

function showMentahModal() {
  mentahOverlay.classList.add('val-overlay--show');
  mentahModal.classList.add('val-toast--show');
}

function hideMentahModal() {
  mentahOverlay.classList.remove('val-overlay--show');
  mentahModal.classList.remove('val-toast--show');
}

document.getElementById('downloadMentahBtn').addEventListener('click', () => {
  showMentahModal();
});

document.getElementById('mentahCancelBtn').addEventListener('click', hideMentahModal);
mentahOverlay.addEventListener('click', hideMentahModal);

document.getElementById('mentahConfirmBtn').addEventListener('click', async () => {
  const jenisInput = document.getElementById('mentahJenisCount').value;
  const ukuranInput = document.getElementById('mentahUkuranCount').value;

  if (!jenisInput || !ukuranInput) {
    alert('Mohon isi kedua kolom dengan angka terlebih dahulu.');
    return;
  }

  const jenisCount = parseInt(jenisInput);
  const ukuranCount = parseInt(ukuranInput);

  if (jenisCount < 1 || ukuranCount < 1) {
    alert('Nilai minimal adalah 1.');
    return;
  }

  hideMentahModal();
  await generatePDF(true, jenisCount, ukuranCount);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Apakah Anda yakin ingin mengosongkan semua data form?')) {
    form.reset();
    groups = [makeGroup('', [makeRow('', '', '', '')])];
    renderGroups();
    updateTotalsPreview();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
  }
});

// --- Preview Modal ---
const previewModal = document.getElementById('previewModal');
const previewOverlay = document.getElementById('previewOverlay');
const previewImg = document.getElementById('previewImg');
const zoomLevelText = document.getElementById('zoomLevel');
const previewWrapper = document.getElementById('previewWrapper');

let currentZoom = 100;
let currentPdfData = null;

function hidePreviewModal() {
  previewOverlay.classList.remove('val-overlay--show');
  previewModal.classList.remove('val-toast--show');
}

document.getElementById('previewCloseBtn').addEventListener('click', hidePreviewModal);
document.getElementById('previewCancelBtn').addEventListener('click', hidePreviewModal);
previewOverlay.addEventListener('click', hidePreviewModal);

document.getElementById('zoomInBtn').addEventListener('click', () => {
  if (currentZoom < 300) currentZoom += 25;
  updateZoom();
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
  if (currentZoom > 50) currentZoom -= 25;
  updateZoom();
});

function updateZoom() {
  zoomLevelText.textContent = `${currentZoom}%`;
  previewWrapper.style.transform = `scale(${currentZoom / 100})`;
}

const actionOverlay = document.getElementById('actionOverlay');
const confirmModal = document.getElementById('confirmModal');
const loadingModal = document.getElementById('loadingModal');

function hideActionModals() {
  actionOverlay.classList.remove('val-overlay--show');
  confirmModal.classList.remove('val-toast--show');
  loadingModal.classList.remove('val-toast--show');
}

document.getElementById('confirmCancelBtn').addEventListener('click', hideActionModals);
actionOverlay.addEventListener('click', () => {
  // Hanya bisa tutup jika confirmModal yang tampil
  if (confirmModal.classList.contains('val-toast--show')) {
    hideActionModals();
  }
});

document.getElementById('previewDownloadBtn').addEventListener('click', () => {
  hidePreviewModal();
  actionOverlay.classList.add('val-overlay--show');
  confirmModal.classList.add('val-toast--show');
});

document.getElementById('confirmOkBtn').addEventListener('click', async () => {
  if (!currentPdfData) return;

  // Tampilkan loading modal
  confirmModal.classList.remove('val-toast--show');
  loadingModal.classList.add('val-toast--show');

  // Beri waktu UI untuk update (munculin spinner)
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const { imgData, pageWidth, pageHeight, imgHeight, fileName } = currentPdfData;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (imgHeight <= pageHeight + 2) {
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 2) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }
    pdf.save(fileName);
  } catch (error) {
    console.error(error);
    alert('Gagal mendownload PDF');
  } finally {
    hideActionModals();
  }
});

async function generatePDF(isMentah, mentahJenis = 5, mentahUkuran = 3) {
  const btn = document.getElementById(isMentah ? 'downloadMentahBtn' : 'downloadBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Membuat Pratinjau...';
  btn.disabled = true;

  try {
    buildPrintArea(isMentah, mentahJenis, mentahUkuran);

    // Reset margin before measuring
    const bottomSection = document.getElementById('docBottomSection');
    if (bottomSection) {
      bottomSection.style.marginTop = '0px';
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    // Cek posisi bottom section, pindah ke halaman berikutnya jika terpotong
    if (bottomSection) {
      const PAGE_HEIGHT = 1123;
      const MARGIN = 76; // sekitar 2cm dalam pixel
      const offsetInPage = bottomSection.offsetTop % PAGE_HEIGHT;
      
      // Jika sisa ruang di halaman ini tidak cukup untuk bottomSection
      if (offsetInPage + bottomSection.offsetHeight > PAGE_HEIGHT - MARGIN) {
         const pushAmount = (PAGE_HEIGHT - offsetInPage) + MARGIN;
         bottomSection.style.marginTop = pushAmount + 'px';
      }
    }

    const printArea = document.getElementById('printArea');
    const canvasResult = await html2canvas(printArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvasResult.toDataURL('image/png');

    // Hitung ukuran untuk PDF
    const { jsPDF } = window.jspdf;
    const tempPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = tempPdf.internal.pageSize.getWidth();
    const pageHeight = tempPdf.internal.pageSize.getHeight();
    const imgHeight = (canvasResult.height * pageWidth) / canvasResult.width;

    let fileName = 'DKB-DKO_dokumen.pdf';
    if (isMentah) {
      fileName = 'DKB-DKO_Kosong.pdf';
    } else {
      const nomor = document.getElementById('nomor').value.trim().replace(/[\/\\]/g, '-').replace(/\s+/g, '_');
      if (nomor) fileName = `DKB-DKO_${nomor}.pdf`;
    }

    currentPdfData = { imgData, pageWidth, pageHeight, imgHeight, fileName };

    // Tampilkan di modal
    previewImg.src = imgData;
    currentZoom = 100;
    updateZoom();

    previewOverlay.classList.add('val-overlay--show');
    previewModal.classList.add('val-toast--show');

  } catch (ex) {
    console.error(ex);
    showToast(['Gagal membuat pratinjau: ' + ex.message]);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}


/* =============================================================== */
/* INIT                                                              */
/* =============================================================== */
const restored = loadData();
if (!restored) {
  groups = [makeGroup('', [makeRow('', '', '', '')])];
}
renderGroups();
updateTotalsPreview();

// Auto-save on any form input change
document.getElementById('dkbForm').addEventListener('input', () => {
  updateTotalsPreview();
  saveData();
});

// Save when signature is drawn (endDraw)
const _origEndDraw = endDraw;
window.addEventListener('mouseup', () => { if (hasSignature) saveData(); });
window.addEventListener('touchend', () => { if (hasSignature) saveData(); });

// Clear localStorage on reset
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Apakah Anda yakin ingin mengosongkan semua data?')) return;
  localStorage.removeItem(SAVE_KEY_DK);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
  groupIdCounter = 0;
  rowIdCounter = 0;
  groups = [makeGroup('', [makeRow('', '', '', '')])];
  FORM_FIELD_IDS_DK.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // restore select defaults
  const satuanSub = document.getElementById('satuanSub');
  if (satuanSub) satuanSub.value = 'Pcs';
  const satuanGrand = document.getElementById('satuanGrand');
  if (satuanGrand) satuanGrand.value = 'Btg';
  renderGroups();
  updateTotalsPreview();
});

/* =============================================================== */
/* PDF SCAN FEATURE                                                  */
/* =============================================================== */

// Set PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// --- Modal elements ---
const ocrOverlay       = document.getElementById('ocrOverlay');
const ocrLoadingModal  = document.getElementById('ocrLoadingModal');
const ocrProgressBar   = document.getElementById('ocrProgressBar');
const ocrLoadingDesc   = document.getElementById('ocrLoadingDesc');
const ocrReviewModal   = document.getElementById('ocrReviewModal');
const ocrGroupsPreview = document.getElementById('ocrGroupsPreview');

// OCR modal data state
let ocrData = { groups: [] };

function showOcrLoading(desc, pct) {
  ocrOverlay.classList.add('val-overlay--show');
  ocrLoadingModal.classList.add('val-toast--show');
  if (desc) ocrLoadingDesc.textContent = desc;
  if (pct !== undefined) ocrProgressBar.style.width = pct + '%';
}

function hideOcrLoading() {
  ocrLoadingModal.classList.remove('val-toast--show');
  ocrOverlay.classList.remove('val-overlay--show');
}

function showOcrReview() {
  // Sembunyikan loading & overlay dulu, lalu tampilkan review (punya backdrop sendiri)
  hideOcrLoading();
  ocrReviewModal.classList.add('ocr-review-modal--show');
}

function hideOcrReview() {
  ocrReviewModal.classList.remove('ocr-review-modal--show');
}

/* ---- Extract text from PDF via PDF.js & Tesseract (Hybrid) ---- */
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    showOcrLoading(`Membaca halaman ${i} dari ${pdf.numPages}...`, Math.round((i / pdf.numPages) * 30));
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    let pageText = '';
    // Coba ambil teks asli (untuk PDF cetak)
    const items = content.items.slice().sort((a, b) => {
      const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5]);
      return yDiff !== 0 ? yDiff : a.transform[4] - b.transform[4];
    });
    
    let lastY = null;
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 4) pageText += '\n';
      pageText += item.str + ' ';
      lastY = y;
    }
    
    // Kalau teks dari PDF kurang dari 50 karakter (kemungkinan ini image-based PDF/hasil download web ini)
    if (pageText.trim().length < 50) {
      showOcrLoading(`Memproses OCR Gambar halaman ${i}...`, 40);
      
      // Render PDF ke Canvas
      const viewport = page.getViewport({ scale: 2.0 }); // Scale tinggi untuk OCR lebih baik
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      
      showOcrLoading(`Menjalankan AI Scanner halaman ${i}...`, 60);
      
      // Jalankan Tesseract.js
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js belum dimuat.');
      }
      
      const worker = await Tesseract.createWorker('ind'); // bahasa indo
      const result = await worker.recognize(canvas);
      pageText = result.data.text;
      await worker.terminate();
    }
    
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}
/* ---- Parse teks PDF jadi objek terstruktur ---- */
/* ---- Parse teks PDF jadi objek terstruktur ---- */
function parsePDFText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result = {
    nomor: '', kabkota: '', provinsi: '',
    jenisAngkut: '', noPolisi: '', namaPemilik: '',
    groups: []
  };

  const fullText = lines.join('\n');
  
  // Nomor
  const nomorMatch = fullText.match(/Nomor\s*[:;]?\s*([^\n]+)/i);
  if (nomorMatch) result.nomor = nomorMatch[1].trim();

  // Kabupaten/Kota
  const kabMatch = fullText.match(/Kabupaten\s*[\/\\]?\s*Kota\s*[:;]?\s*([^\n]+)/i);
  if (kabMatch) result.kabkota = kabMatch[1].trim();

  // Provinsi
  const provMatch = fullText.match(/Provinsi\s*[:;]?\s*([^\n]+)/i);
  if (provMatch) result.provinsi = provMatch[1].trim();

  // Jenis Alat Angkut (Hati-hati jika NO POL ada di baris yang sama)
  const alatMatch = fullText.match(/Jenis\s+Alat\s*Angkut\s*[:;]?\s*([^\n]+)/i);
  if (alatMatch) result.jenisAngkut = alatMatch[1].replace(/NO\.?P[O0]L.*$/i, '').trim();

  // NO POL
  const nopolMatch = fullText.match(/NO\.?P[O0]L\s*[:;]?\s*([^\n]+)/i);
  if (nopolMatch) result.noPolisi = nopolMatch[1].trim();

  // Nama Pemilik
  const namaMatch = fullText.match(/PEMILIK\s*HUTAN\s*HAK\s+([^\n]+)/i);
  if (namaMatch) result.namaPemilik = namaMatch[1].trim();

  // --- Parse tabel kayu (Sangat Toleran OCR) ---
  const groupMap = new Map();
  let currentGroupName = 'Kayu'; // Default name if no name is found

  // Pola Row: [Optional No] [Optional Nama Kayu] [Jumlah] [Panjang] [Diameter] [Optional Volume]
  // Contoh: "1 Jati 45 200 3 x 12 0 M3" atau "3 200 3 x 14"
  const rowPattern = /^(?:(\d+)\s+([A-Za-z][A-Za-z\s]*?)\s+)?(\d+)\s+(\d+)\s+([\d.,]+(?:\s*[xX×*]\s*[\d.,]+)?)(?:\s+(.*?))?$/i;

  for (let i = 0; i < lines.length; i++) {
    // Bersihkan karakter aneh yang sering muncul dari garis tabel di OCR
    const line = lines[i].replace(/[|]/g, '').trim(); 

    const m = line.match(rowPattern);
    if (m) {
       const nama = (m[2] || '').trim();
       if (nama && nama.length > 2 && nama.toLowerCase() !== 'jumlah') {
         currentGroupName = nama;
       }
       
       if (!groupMap.has(currentGroupName)) groupMap.set(currentGroupName, []);
       
       let vol = (m[6] || '').trim();
       // Bersihkan "0 M3" atau "0 M'" yang sering salah terbaca
       if (vol.replace(/\s+/g, '').match(/^0m/i)) vol = '0'; 

       groupMap.get(currentGroupName).push({
         jumlah: m[3],
         panjang: m[4],
         diameter: m[5].replace(/\s/g, ''), // hilangkan spasi di diameter (contoh "3x12")
         volume: vol
       });
    }
  }

  if (groupMap.size > 0) {
    groupMap.forEach((rows, nama) => {
      result.groups.push({ nama, rows });
    });
  }

  if (result.groups.length === 0) {
    result.groups.push({ nama: '', rows: [{ jumlah: '', panjang: '', diameter: '', volume: '' }] });
  }

  return result;
}

/* ---- Render grup di modal review ---- */
function renderOcrGroupsPreview() {
  ocrGroupsPreview.innerHTML = '';
  document.getElementById('ocrGroupCount').textContent =
    ocrData.groups.length > 0 ? `(${ocrData.groups.length} jenis)` : '';

  ocrData.groups.forEach((group, gi) => {
    const card = document.createElement('div');
    card.className = 'ocr-group-card';

    // Header: label + input nama + remove btn
    const header = document.createElement('div');
    header.className = 'ocr-group-header';

    const label = document.createElement('span');
    label.className = 'ocr-group-label';
    label.textContent = `#${gi + 1}`;

    const namaInp = document.createElement('input');
    namaInp.className = 'ocr-group-nama';
    namaInp.type = 'text';
    namaInp.placeholder = 'Nama jenis kayu...';
    namaInp.value = group.nama;
    namaInp.addEventListener('input', e => { group.nama = e.target.value; });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ocr-group-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      ocrData.groups.splice(gi, 1);
      renderOcrGroupsPreview();
    });

    header.appendChild(label);
    header.appendChild(namaInp);
    header.appendChild(removeBtn);
    card.appendChild(header);

    // Tabel rows
    const table = document.createElement('table');
    table.className = 'ocr-rows-table';
    table.innerHTML = `<thead><tr>
      <th>Jumlah</th><th>Panjang (cm)</th><th>Diameter (cm)</th><th>Volume (m³)</th><th></th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');

    function addOcrRow(row) {
      const tr = document.createElement('tr');
      ['jumlah','panjang','diameter','volume'].forEach(key => {
        const td = document.createElement('td');
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = row[key] || '';
        inp.placeholder = key === 'diameter' ? '0' : '0';
        inp.addEventListener('input', e => { row[key] = e.target.value; });
        td.appendChild(inp);
        tr.appendChild(td);
      });
      const tdDel = document.createElement('td');
      tdDel.className = 'td-del';
      const delBtn = document.createElement('button');
      delBtn.className = 'ocr-row-del-btn';
      delBtn.type = 'button';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        const idx = group.rows.indexOf(row);
        if (idx > -1) group.rows.splice(idx, 1);
        if (group.rows.length === 0) group.rows.push({ jumlah:'', panjang:'', diameter:'', volume:'' });
        renderOcrGroupsPreview();
      });
      tdDel.appendChild(delBtn);
      tr.appendChild(tdDel);
      tbody.appendChild(tr);
    }

    group.rows.forEach(addOcrRow);
    table.appendChild(tbody);
    card.appendChild(table);

    // Tambah baris
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'btn btn--ghost ocr-add-row-btn';
    addRowBtn.textContent = '+ Tambah Ukuran';
    addRowBtn.addEventListener('click', () => {
      group.rows.push({ jumlah:'', panjang:'', diameter:'', volume:'' });
      renderOcrGroupsPreview();
    });
    card.appendChild(addRowBtn);

    ocrGroupsPreview.appendChild(card);
  });
}

/* ---- Terapkan data OCR ke form utama ---- */
function applyOcrToForm() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  };
  set('nomor',      document.getElementById('ocr_nomor').value);
  set('kabkota',    document.getElementById('ocr_kabkota').value);
  set('provinsi',   document.getElementById('ocr_provinsi').value);
  set('jenisAngkut',document.getElementById('ocr_jenisAngkut').value);
  set('noPolisi',   document.getElementById('ocr_noPolisi').value);
  set('namaPemilik',document.getElementById('ocr_namaPemilik').value);

  // Reset dan isi groups
  groupIdCounter = 0;
  rowIdCounter = 0;
  groups = ocrData.groups.map(g => {
    groupIdCounter++;
    return {
      id: 'g' + groupIdCounter,
      nama: g.nama,
      rows: g.rows.map(r => {
        rowIdCounter++;
        return { id: 'r' + rowIdCounter, jumlah: r.jumlah || '', panjang: r.panjang || '', diameter: r.diameter || '', volume: r.volume || '' };
      })
    };
  });

  if (groups.length === 0) groups = [makeGroup('', [makeRow('', '', '', '')])];

  renderGroups();
  updateTotalsPreview();
  saveData();
  hideOcrReview();

  // Scroll ke atas form
  document.querySelector('.form-panel').scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- Wire up events ---- */
document.getElementById('scanPdfInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset so same file can be re-selected

  if (typeof pdfjsLib === 'undefined') {
    alert('Library PDF.js belum dimuat. Periksa koneksi internet dan coba lagi.');
    return;
  }

  showOcrLoading('Membuka file PDF...', 10);

  try {
    const rawText = await extractTextFromPDF(file);
    showOcrLoading('Menganalisis teks...', 90);

    await new Promise(r => setTimeout(r, 200));

    const parsed = parsePDFText(rawText);
    ocrData = parsed;

    hideOcrLoading();

    // Isi field modal
    document.getElementById('ocr_nomor').value       = parsed.nomor;
    document.getElementById('ocr_kabkota').value     = parsed.kabkota;
    document.getElementById('ocr_provinsi').value    = parsed.provinsi;
    document.getElementById('ocr_jenisAngkut').value = parsed.jenisAngkut;
    document.getElementById('ocr_noPolisi').value    = parsed.noPolisi;
    document.getElementById('ocr_namaPemilik').value = parsed.namaPemilik;

    renderOcrGroupsPreview();
    showOcrReview();

  } catch (err) {
    hideOcrLoading();
    ocrOverlay.classList.remove('val-overlay--show');
    console.error(err);
    alert('Gagal membaca PDF: ' + err.message + '\n\nPastikan file adalah PDF yang valid.');
  }
});

document.getElementById('ocrAddGroupBtn').addEventListener('click', () => {
  ocrData.groups.push({ nama: '', rows: [{ jumlah:'', panjang:'', diameter:'', volume:'' }] });
  renderOcrGroupsPreview();
});

document.getElementById('ocrApplyBtn').addEventListener('click', applyOcrToForm);
document.getElementById('ocrCancelBtn').addEventListener('click', hideOcrReview);
document.getElementById('ocrReviewCloseBtn').addEventListener('click', hideOcrReview);
// ocrOverlay is only for loading state — clicking it cancels the loading
ocrOverlay.addEventListener('click', hideOcrLoading);
// Clicking review modal backdrop (outside inner box) also closes it
ocrReviewModal.addEventListener('click', (e) => {
  if (e.target === ocrReviewModal) hideOcrReview();
});


