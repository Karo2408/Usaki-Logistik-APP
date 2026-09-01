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
  wrap.appendChild(field('Panjang (m)', panjangInput));
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
/* TAMBAH JENIS KAYU BARU                                           */
/* =============================================================== */
document.getElementById('addGroupBtn').addEventListener('click', () => {
  groups.push(makeGroup('', [makeRow('', '', '', '')]));
  renderGroups();
  updateTotalsPreview();
});

// Ketika satuan grand total diubah, refresh semua subtotal yang tampil
document.getElementById('satuanGrand').addEventListener('input', () => {
  groups.forEach(group => refreshSubtotal(group));
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

    await new Promise(resolve => setTimeout(resolve, 50));

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
renderGroups();
updateTotalsPreview();
