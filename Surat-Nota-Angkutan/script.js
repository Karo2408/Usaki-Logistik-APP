/* =========================================================
   NOTA ANGKUTAN - APP LOGIC
   Tidak menggunakan database/backend. Semua data disimpan
   sementara di memory (array rows[]) selama sesi browser.
========================================================= */

(function () {
  "use strict";

  // ---------- STATE ----------
  let rows = []; // { id, jenis, jumlah, volume, keterangan }
  let rowIdCounter = 0;
  let signatureData = null; // Store signature image base64
  const rowsContainer = document.getElementById("rowsContainer");
  const outTbody = document.getElementById("out-tbody");
  const form = document.getElementById("notaForm");
  const formError = document.getElementById("formError");

  // ---------- HELPERS ----------
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function formatTanggalIndo(dateStr) {
    if (!dateStr) return "";
    const bulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  }

  function todayIndo() {
    const d = new Date();
    const bulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  }

  function setText(pageNode, selector, value) {
    const node = pageNode.querySelector(selector);
    if (node) node.textContent = value && String(value).trim() !== "" ? value : "";
  }

  function numberToWordsIndo(num) {
    const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    if (num < 12) return units[num];
    if (num < 20) return units[num - 10] + " Belas";
    if (num < 100) return units[Math.floor(num / 10)] + " Puluh" + (num % 10 !== 0 ? " " + units[num % 10] : "");
    if (num < 200) return "Seratus" + (num - 100 !== 0 ? " " + numberToWordsIndo(num - 100) : "");
    if (num < 1000) return units[Math.floor(num / 100)] + " Ratus" + (num % 100 !== 0 ? " " + numberToWordsIndo(num % 100) : "");
    return num.toString();
  }

  function formatSelama(val) {
    if (!val) return "";
    const trimVal = String(val).trim();
    const num = parseInt(trimVal, 10);
    // Jika input hanya angka murni
    if (!isNaN(num) && num > 0 && num.toString() === trimVal) {
      const padded = num < 10 ? "0" + num : num.toString();
      const spelled = numberToWordsIndo(num);
      return `${padded} (${spelled}) Hari`;
    }
    return val; // Jika user mengisi manual teks "3 hari", biarkan saja
  }

  // ---------- PREVIEW RENDER ----------
  function getFormValues() {
    const data = {};
    Array.from(form.elements).forEach((elm) => {
      if (elm.name) data[elm.name] = elm.value;
    });
    return data;
  }

  function renderPreview() {
    const data = getFormValues();
    const container = document.getElementById("pagesContainer");
    const template = document.getElementById("pageTemplate");
    container.innerHTML = ""; // Clear existing

    // Calculate totals for the entire document
    let totalJumlah = 0;
    let totalVolume = 0;
    let jumlahIsAllNumeric = true;
    let volumeIsAllNumeric = true;

    rows.forEach(row => {
      const jNum = parseFloat((row.jumlah || "").replace(",", "."));
      const vNum = parseFloat((row.volume || "").replace(",", "."));
      if (!isNaN(jNum)) totalJumlah += jNum; else if (row.jumlah) jumlahIsAllNumeric = false;
      if (!isNaN(vNum)) totalVolume += vNum; else if (row.volume) volumeIsAllNumeric = false;
    });

    // Determine the unit for the total (use unit from first filled row, or dominant unit)
    const satuanCounts = {};
    rows.forEach(row => {
      if (row.jumlah && row.satuanJumlah) {
        satuanCounts[row.satuanJumlah] = (satuanCounts[row.satuanJumlah] || 0) + 1;
      }
    });
    const dominantSatuan = Object.keys(satuanCounts).sort((a, b) => satuanCounts[b] - satuanCounts[a])[0] || "";

    const totalJumlahStr = jumlahIsAllNumeric && totalJumlah > 0
      ? formatNumber(totalJumlah) + (dominantSatuan ? " " + dominantSatuan : "")
      : "";
    const totalVolumeStr = volumeIsAllNumeric && totalVolume > 0 ? formatNumber(totalVolume) + " M³" : "";

    const ROWS_PAGE_1 = 12;
    const ROWS_PAGE_N = 12;

    let remainingRows = [...rows];
    // Ensure at least 1 row to not break table visually
    if (remainingRows.length === 0) {
      remainingRows = [{ jenis: "", jumlah: "", volume: "", keterangan: "" }];
    }

    let pageNum = 1;
    let rowStartIdx = 0;

    while (remainingRows.length > 0 || pageNum === 1) {
      const isPage1 = (pageNum === 1);
      const limit = isPage1 ? ROWS_PAGE_1 : ROWS_PAGE_N;

      const pageRows = remainingRows.splice(0, limit);
      const isLastPage = (remainingRows.length === 0);

      // Clone template
      const pageFrag = template.content.cloneNode(true);
      const pageNode = pageFrag.querySelector(".doc-sheet");

      // Common headers
      setText(pageNode, ".out-nomor", data.nomor);

      // Top info (Asal, Tujuan) - only on Page 1
      const topInfo = pageNode.querySelector(".doc-top-info");
      if (isPage1) {
        setText(pageNode, ".out-desa", data.desa);
        setText(pageNode, ".out-kabupaten", data.kabupaten);
        setText(pageNode, ".out-kecamatan", data.kecamatan);
        setText(pageNode, ".out-provinsi", data.provinsi);
        setText(pageNode, ".out-buktiKepemilikan", data.buktiKepemilikan);
        setText(pageNode, ".out-noBuktiKepemilikan", data.noBuktiKepemilikan);
        setText(pageNode, ".out-pengirim", data.pengirim);
        setText(pageNode, ".out-alamatPengirim1", data.alamatPengirim1);
        setText(pageNode, ".out-alamatPengirim2", data.alamatPengirim2);
        setText(pageNode, ".out-tempatMuat", data.tempatMuat);
        setText(pageNode, ".out-jenisIdentitas", data.jenisIdentitas);
        setText(pageNode, ".out-alatAngkut", data.alatAngkut);
        setText(pageNode, ".out-noPol", data.noPol);

        setText(pageNode, ".out-namaPenerima", data.namaPenerima);
        setText(pageNode, ".out-alamatPenerima1", data.alamatPenerima1);
        setText(pageNode, ".out-alamatPenerima2", data.alamatPenerima2);

        setText(pageNode, ".out-selama", formatSelama(data.selama));
        setText(pageNode, ".out-dariTanggal", formatTanggalIndo(data.dariTanggal));
        setText(pageNode, ".out-sampaiTanggal", formatTanggalIndo(data.sampaiTanggal));
      } else {
        topInfo.style.display = "none";
      }

      // Populate table rows
      const tbody = pageNode.querySelector(".out-tbody");
      pageRows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.appendChild(el("td", "col-nomor", String(rowStartIdx + idx + 1)));
        tr.appendChild(el("td", "col-jenis", row.jenis));
        tr.appendChild(el("td", "col-jumlah", row.jumlah || ""));
        tr.appendChild(el("td", "col-volume", row.volume));
        tr.appendChild(el("td", "col-ket", row.keterangan));
        tbody.appendChild(tr);
      });
      rowStartIdx += pageRows.length;

      // Bottom info (Catatan, Tanda Tangan, Totals)
      const bottomInfo = pageNode.querySelector(".doc-bottom-info");
      const tfoot = pageNode.querySelector(".out-tfoot");

      if (isLastPage) {
        setText(pageNode, ".out-totalJumlah", totalJumlahStr);
        setText(pageNode, ".out-totalVolume", totalVolumeStr);

        const kota = (data.kotaTtd || "").trim();
        const tglValue = (data.tanggalTtd || "").trim();
        const formattedTgl = tglValue ? formatTanggalIndo(tglValue) : todayIndo();
        const tglLine = (kota ? kota + ", " : "") + formattedTgl;
        setText(pageNode, ".out-tglTtd", tglLine);
        setText(pageNode, ".out-namaPemilik", data.namaPemilik || "");

        // Signature image
        const sigImg = pageNode.querySelector(".out-signature");
        if (sigImg && signatureData) {
          sigImg.src = signatureData;
          sigImg.style.display = "block";
        }

        // Catatan
        const catatanNode = pageNode.querySelector(".out-catatan");
        if (catatanNode) {
          catatanNode.textContent = (data.catatan || "").trim();
          catatanNode.style.display = (data.catatan || "").trim() ? "block" : "none";
        }
      } else {
        // If not last page, hide totals and bottom signature section
        tfoot.style.display = "none";
        bottomInfo.style.display = "none";
      }

      container.appendChild(pageNode);
      if (isLastPage) break;
      pageNum++;
    }
  }

  function formatNumber(n) {
    // Buang trailing .00 jika bulat
    return Number.isInteger(n) ? String(n) : String(n.toFixed(2));
  }

  // ---------- VALIDASI ----------
  // Map field id -> label yang ditampilkan di popup
  const FIELD_LABELS = [
    { id: "nomor",            label: "Nomor" },
    { id: "desa",             label: "Desa" },
    { id: "kecamatan",        label: "Kecamatan" },
    { id: "kabupaten",        label: "Kabupaten/Kota" },
    { id: "provinsi",         label: "Provinsi" },
    { id: "buktiKepemilikan", label: "Bukti Kepemilikan" },
    { id: "noBuktiKepemilikan", label: "No. Bukti Kepemilikan" },
    { id: "pengirim",         label: "Pengirim" },
    { id: "alamatPengirim1",  label: "Alamat Pengirim (baris 1)" },
    { id: "tempatMuat",       label: "Tempat Muat" },
    { id: "jenisIdentitas",   label: "Jenis dan Identitas" },
    { id: "alatAngkut",       label: "Alat Angkut" },
    { id: "noPol",            label: "NO. POL" },
    { id: "namaPenerima",     label: "Nama Penerima" },
    { id: "alamatPenerima1",  label: "Alamat Penerima (baris 1)" },
    { id: "selama",           label: "Selama" },
    { id: "dariTanggal",      label: "Dari Tanggal" },
    { id: "sampaiTanggal",    label: "Sampai Tanggal" },
    { id: "kotaTtd",          label: "Kota (Tanda Tangan)" },
    { id: "namaPemilik",      label: "Nama Pemilik Hutan Hak" },
  ];

  function validateForm() {
    const missing = [];
    FIELD_LABELS.forEach(({ id, label }) => {
      const node = document.getElementById(id);
      if (node && !node.value.trim()) missing.push(label);
    });
    const hasRowContent = rows.some(r => r.jenis.trim() || r.jumlah.trim() || r.volume.trim());
    if (!hasRowContent) missing.push("Rincian Hasil Hutan (min. 1 baris)");
    return missing;
  }

  // ---------- VALIDATION POPUP ----------
  function showValidationPopup(missing) {
    const existing = document.getElementById("validationPopupOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "validationPopupOverlay";
    overlay.className = "validation-popup-overlay";

    const popup = document.createElement("div");
    popup.className = "validation-popup";
    popup.setAttribute("role", "alert");

    const header = document.createElement("div");
    header.className = "validation-popup__header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "validation-popup__title";
    headerLeft.innerHTML = `<span class="validation-popup__icon">⚠️</span> Mohon lengkapi data berikut:`;

    const closeBtn = document.createElement("button");
    closeBtn.className = "validation-popup__close";
    closeBtn.type = "button";
    closeBtn.innerHTML = "&#x2715; Tutup";
    closeBtn.addEventListener("click", () => overlay.remove());

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    const chips = document.createElement("div");
    chips.className = "validation-popup__chips";
    missing.forEach(label => {
      const chip = document.createElement("span");
      chip.className = "validation-popup__chip";
      chip.innerHTML = `<span class="validation-popup__chip-x">&#x2715;</span> ${label}`;
      chips.appendChild(chip);
    });

    popup.appendChild(header);
    popup.appendChild(chips);
    overlay.appendChild(popup);

    // Close when clicking the backdrop
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  // ---------- MODAL, PREVIEW, & ZOOM ----------
  const previewModal = document.getElementById("previewModal");
  const pagesContainer = document.getElementById("pagesContainer");
  const modalPreviewScroll = document.getElementById("modalPreviewScroll");
  const zoomLevelLabel = document.getElementById("zoomLevel");
  let currentZoom = 1;

  function updateZoom() {
    pagesContainer.style.transform = `scale(${currentZoom})`;
    zoomLevelLabel.textContent = Math.round(currentZoom * 100) + "%";
  }

  function handleZoomIn() {
    if (currentZoom < 2.0) {
      currentZoom = Math.min(2.0, currentZoom + 0.1);
      updateZoom();
    }
  }

  function handleZoomOut() {
    if (currentZoom > 0.3) {
      currentZoom = Math.max(0.3, currentZoom - 0.1);
      updateZoom();
    }
  }

  modalPreviewScroll.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        currentZoom = Math.min(2.0, currentZoom + 0.05);
      } else {
        currentZoom = Math.max(0.2, currentZoom - 0.05);
      }
      updateZoom();
    }
  }, { passive: false });

  function openModal() {
    formError.textContent = "";
    const missing = validateForm();
    if (missing.length > 0) {
      showValidationPopup(missing);
      return;
    }

    // Auto-scale to fit window on open
    const padding = 48; // modal padding
    const maxDocWidth = 794;
    const availableWidth = window.innerWidth - padding;

    if (availableWidth < maxDocWidth) {
      currentZoom = availableWidth / maxDocWidth;
    } else {
      currentZoom = 1;
    }

    renderPreview();
    updateZoom();
    previewModal.classList.add("active");
  }

  function closeModal() {
    previewModal.classList.remove("active");
  }

  document.getElementById("previewBtn").addEventListener("click", openModal);
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelDownloadBtn").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeModal);

  document.getElementById("zoomInBtn").addEventListener("click", handleZoomIn);
  document.getElementById("zoomOutBtn").addEventListener("click", handleZoomOut);



  // ---------- ROW MANAGEMENT (TABEL ISI) ----------
  function addRow(initial) {
    const row = Object.assign({
      id: ++rowIdCounter,
      jenis: "",
      jumlah: "",
      satuanJumlah: "BTG",
      volume: "",
      keterangan: ""
    }, initial || {});
    rows.push(row);
    renderRowEditor();
    renderPreview();
  }


  function renderRowEditor() {
    rowsContainer.innerHTML = "";
    rows.forEach((row, index) => {
      const item = el("div", "row-item");
      item.dataset.id = row.id;

      const headerWrap = el("div", "row-item-header");
      const title = el("div", "row-item-title", `Baris ${index + 1}`);
      const deleteBtn = el("button", "row-delete-btn", "Hapus");
      deleteBtn.type = "button";
      deleteBtn.title = "Hapus baris ini";
      deleteBtn.addEventListener("click", () => {
        rows = rows.filter(r => r.id !== row.id);
        if (rows.length === 0) {
          rows.push({ id: ++rowIdCounter, jenis: "", jumlah: "", satuanJumlah: "BTG", volume: "", keterangan: "" });
        }
        renderRowEditor();
        renderPreview();
      });
      headerWrap.appendChild(title);
      headerWrap.appendChild(deleteBtn);

      const jenisWrap = makeRowField(row, "jenis", "text", "Jenis Hasil Hutan", "field-full");

      // Jumlah + satuan dropdown
      const jumlahWrap = el("div", "row-field field-half");
      const jumlahLabel = el("label", "", "Jumlah");
      const jumlahInputRow = el("div", "jumlah-input-row");
      const jumlahInput = document.createElement("input");
      jumlahInput.type = "text";
      jumlahInput.value = row.jumlah;
      jumlahInput.placeholder = "0";
      jumlahInput.className = "jumlah-number-input";
      jumlahInput.addEventListener("input", (e) => {
        row.jumlah = e.target.value;
        renderPreview();
      });
      const satuanSelect = document.createElement("select");
      satuanSelect.className = "satuan-select";
      [["BTG", "BTG (Batang)"], ["KPL", "KPL (Kapling)"], ["IKT", "IKT (Ikat)"]].forEach(([val, label]) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = label;
        if (row.satuanJumlah === val) opt.selected = true;
        satuanSelect.appendChild(opt);
      });
      satuanSelect.addEventListener("change", (e) => {
        row.satuanJumlah = e.target.value;
        renderPreview();
      });
      jumlahInputRow.appendChild(jumlahInput);
      jumlahInputRow.appendChild(satuanSelect);
      jumlahWrap.appendChild(jumlahLabel);
      jumlahWrap.appendChild(jumlahInputRow);

      const volumeWrap = makeRowField(row, "volume", "text", "Volume (SM)", "field-half");
      const ketWrap = makeRowField(row, "keterangan", "text", "Keterangan", "field-full");

      item.appendChild(headerWrap);
      item.appendChild(jenisWrap);
      item.appendChild(jumlahWrap);
      item.appendChild(volumeWrap);
      item.appendChild(ketWrap);

      rowsContainer.appendChild(item);
    });
  }

  function makeRowField(row, field, type, labelText, extraClass) {
    const wrap = el("div", `row-field ${extraClass}`);
    const label = el("label", "", labelText);
    const input = document.createElement("input");
    input.type = type;
    input.value = row[field];
    input.placeholder = `Masukkan ${labelText.toLowerCase()}`;
    input.addEventListener("input", (e) => {
      row[field] = e.target.value;
      renderPreview();
    });
    wrap.appendChild(label);
    wrap.appendChild(input);
    return wrap;
  }

  // ---------- DOWNLOAD PDF ----------
  // ---------- CONFIRM + LOADING HELPERS ----------
  const confirmModal = document.getElementById("confirmModal");
  const confirmModalTitle = document.getElementById("confirmModalTitle");
  const confirmModalDesc = document.getElementById("confirmModalDesc");
  const confirmModalOk = document.getElementById("confirmModalOk");
  const confirmModalCancel = document.getElementById("confirmModalCancel");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingLabel = document.getElementById("loadingLabel");
  const loadingBar = document.getElementById("loadingBar");
  const loadingSub = document.getElementById("loadingSub");

  function showConfirm(title, desc, isBlankDownload = false) {
    return new Promise((resolve) => {
      confirmModalTitle.textContent = title;
      confirmModalDesc.textContent = desc;
      
      const blankRowConfig = document.getElementById("blankRowConfig");
      if (blankRowConfig) {
        blankRowConfig.style.display = isBlankDownload ? "block" : "none";
        if (isBlankDownload) {
          document.getElementById("blankRowCount").value = "1";
        }
      }

      confirmModal.classList.add("active");
      confirmModal.setAttribute("aria-hidden", "false");

      function onOk() { cleanup(); resolve(true); }
      function onCancel() { cleanup(); resolve(false); }
      function onBackdrop(e) { if (e.target === confirmModal || e.target.classList.contains("confirm-modal__backdrop")) { cleanup(); resolve(false); } }

      function cleanup() {
        confirmModal.classList.remove("active");
        confirmModal.setAttribute("aria-hidden", "true");
        confirmModalOk.removeEventListener("click", onOk);
        confirmModalCancel.removeEventListener("click", onCancel);
        confirmModal.removeEventListener("click", onBackdrop);
      }

      confirmModalOk.addEventListener("click", onOk);
      confirmModalCancel.addEventListener("click", onCancel);
      confirmModal.addEventListener("click", onBackdrop);
    });
  }

  function showLoading(label, sub) {
    loadingLabel.textContent = label || "Memproses...";
    loadingSub.textContent = sub || "Menyiapkan dokumen";
    loadingBar.style.width = "0%";
    loadingOverlay.classList.add("active");
    loadingOverlay.setAttribute("aria-hidden", "false");
  }

  function setProgress(percent, sub) {
    loadingBar.style.width = Math.min(100, percent) + "%";
    if (sub) loadingSub.textContent = sub;
  }

  function hideLoading() {
    loadingBar.style.width = "100%";
    setTimeout(() => {
      loadingOverlay.classList.remove("active");
      loadingOverlay.setAttribute("aria-hidden", "true");
      loadingBar.style.width = "0%";
    }, 400);
  }

  async function downloadPDF() {
    const btn = document.getElementById("confirmDownloadBtn");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Memproses PDF...";

    const cancelBtn = document.getElementById("cancelDownloadBtn");
    cancelBtn.disabled = true;

    // Temporarily disable transform to fix html2canvas rendering bug
    const oldTransform = pagesContainer.style.transform;
    pagesContainer.style.transform = "none";

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const pages = document.querySelectorAll("#pagesContainer .doc-sheet");

      showLoading("Membuat PDF...", "Menyiapkan halaman...");
      setProgress(5, "Memulai proses...");

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const progress = 10 + Math.round(((i + 0.5) / pages.length) * 80);
        setProgress(progress, `Memproses halaman ${i + 1} dari ${pages.length}...`);

        // Kloning node untuk menghindari bug rendering CSS Transform & Modal
        const clone = pages[i].cloneNode(true);

        // Posisikan clone di luar layar dengan style mentah
        Object.assign(clone.style, {
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          transform: "none",
          margin: "0",
          boxShadow: "none",
          width: "794px"
        });
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 3,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          windowWidth: 794
        });

        // Hapus clone setelah selesai
        document.body.removeChild(clone);

        const imgData = canvas.toDataURL("image/png");
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      }

      setProgress(95, "Menyimpan file PDF...");
      const nomorNota = (document.getElementById("nomor").value || "nota").replace(/[\\/:*?"<>|]/g, "-");
      pdf.save(`Nota-Angkutan-${nomorNota}.pdf`);
      hideLoading();
      closeModal();
    } catch (err) {
      console.error(err);
      hideLoading();
      alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
    } finally {
      // Restore transform
      pagesContainer.style.transform = oldTransform;

      btn.disabled = false;
      btn.textContent = originalLabel;
      cancelBtn.disabled = false;
    }
  }

  // ---------- RESET ----------
  function resetAll() {
    setTimeout(() => {
      rows = [];
      rowIdCounter = 0;
      addRow();
      
      const sigCnv = document.getElementById('signaturePad');
      if (sigCnv) {
        const ctx = sigCnv.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, sigCnv.width, sigCnv.height);
        signatureData = null;
      }

      renderPreview();
      formError.textContent = "";
    }, 0);
  }

  // ---------- EVENTS ----------
  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  form.addEventListener("reset", (e) => {
    if (!confirm("Apakah Anda yakin ingin mengosongkan semua data form?")) {
      e.preventDefault();
      return;
    }
    resetAll();
  });
  form.addEventListener("input", renderPreview);

      // Wire up confirm modal to Lanjut Download PDF btn in preview modal
  document.getElementById("confirmDownloadBtn").addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "Download PDF",
      "Dokumen akan diunduh sebagai file PDF. Pastikan semua data sudah benar."
    );
    if (confirmed) downloadPDF();
  });

  const downloadBlankBtn = document.getElementById("downloadBlankBtn");
  if (downloadBlankBtn) {
    downloadBlankBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Download File Mentah",
        "File PDF kosong (blangko) tanpa isian akan diunduh. Data yang sudah Anda isi tidak akan hilang.",
        true
      );
      if (!confirmed) return;

      const btn = downloadBlankBtn;
      const originalLabel = btn.textContent;

      const originalRows = [...rows];
      const originalValues = getFormValues();

      try {
        btn.disabled = true;
        btn.textContent = "Menyiapkan File Mentah...";

        Array.from(form.elements).forEach(el => {
          if (el.name && !["radio", "checkbox", "button", "submit", "reset"].includes(el.type)) {
            el.value = "";
          }
        });
        
        const numRows = parseInt(document.getElementById("blankRowCount").value, 10) || 1;
        rows = [];
        for (let i = 0; i < numRows; i++) {
          rows.push({ id: ++rowIdCounter, jenis: "", jumlah: "", satuanJumlah: "BTG", volume: "", keterangan: "" });
        }

        renderPreview();
        await new Promise(r => setTimeout(r, 100));

        // Ganti bagian tanda tangan jadi versi mentah (hapus tanggal, kasih garis nama)
        const sigNode = document.querySelector("#pagesContainer .doc-signature__inner");
        if (sigNode) {
          sigNode.innerHTML = `
            <div style="font-size:14px; margin-bottom: 4px;">Pemilik Hutan Hak</div>
          `;
        }

        showLoading("Membuat File Mentah...", "Menyiapkan halaman...");
        setProgress(5, "Memulai proses...");

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageNodes = document.querySelectorAll("#pagesContainer .doc-sheet");

        for (let i = 0; i < pageNodes.length; i++) {
          if (i > 0) pdf.addPage();
          const progress = 10 + Math.round(((i + 0.5) / pageNodes.length) * 80);
          setProgress(progress, `Memproses halaman ${i + 1} dari ${pageNodes.length}...`);
          const clone = pageNodes[i].cloneNode(true);
          Object.assign(clone.style, {
            position: "absolute",
            top: "-9999px",
            left: "-9999px",
            transform: "none",
            margin: "0",
            boxShadow: "none",
            width: "794px"
          });
          document.body.appendChild(clone);

          const canvas = await html2canvas(clone, {
            scale: 3,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            windowWidth: 794
          });
          document.body.removeChild(clone);

          const imgData = canvas.toDataURL("image/png");
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        }

        setProgress(95, "Menyimpan file PDF...");
        pdf.save(`Nota-Angkutan-Kosong.pdf`);
        hideLoading();
      } catch (err) {
        console.error(err);
        hideLoading();
        alert("Gagal membuat file mentah.");
      } finally {
        Object.keys(originalValues).forEach(key => {
          const el = form.elements[key];
          if (el && !["radio", "checkbox", "button", "submit", "reset"].includes(el.type)) {
            el.value = originalValues[key];
          }
        });
        rows = originalRows;
        renderRowEditor();
        renderPreview();

        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  }

  // ---------- SIGNATURE PAD ----------
  const sigCanvas = document.getElementById('signaturePad');
  const sigCtx = sigCanvas ? sigCanvas.getContext('2d', { willReadFrequently: true }) : null;
  let isDrawingSig = false;
  let sigLastX = 0;
  let sigLastY = 0;

  if (sigCanvas && sigCtx) {
    // Resize canvas on load to match display size to prevent stretching
    function resizeCanvas() {
      const rect = sigCanvas.parentElement.getBoundingClientRect();
      sigCanvas.width = rect.width || 400;
      sigCanvas.height = rect.height || 200;
      sigCtx.lineWidth = 2;
      sigCtx.lineCap = 'round';
      sigCtx.lineJoin = 'round';
      sigCtx.strokeStyle = '#000000';
      if (signatureData) {
        const img = new Image();
        img.onload = () => sigCtx.drawImage(img, 0, 0);
        img.src = signatureData;
      }
    }
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100); // init

    function getSigPos(e) {
      const r = sigCanvas.getBoundingClientRect();
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      const scaleX = sigCanvas.width / r.width;
      const scaleY = sigCanvas.height / r.height;
      return {
        x: (clientX - r.left) * scaleX,
        y: (clientY - r.top) * scaleY
      };
    }

    function drawSig(e) {
      if (!isDrawingSig) return;
      e.preventDefault();
      const pos = getSigPos(e);
      sigCtx.beginPath();
      sigCtx.moveTo(sigLastX, sigLastY);
      sigCtx.lineTo(pos.x, pos.y);
      sigCtx.stroke();
      sigLastX = pos.x;
      sigLastY = pos.y;
    }

    function saveSig() {
      // Create a temporary canvas to get a cropped bounding box if needed,
      // but for simplicity we just save the whole canvas.
      signatureData = sigCanvas.toDataURL("image/png");
      renderPreview();
    }

    sigCanvas.addEventListener('mousedown', (e) => {
      isDrawingSig = true;
      const pos = getSigPos(e);
      sigLastX = pos.x; sigLastY = pos.y;
    });
    sigCanvas.addEventListener('mousemove', drawSig);
    window.addEventListener('mouseup', () => { if (isDrawingSig) { isDrawingSig = false; saveSig(); } });

    sigCanvas.addEventListener('touchstart', (e) => {
      isDrawingSig = true;
      const pos = getSigPos(e);
      sigLastX = pos.x; sigLastY = pos.y;
    }, { passive: false });
    sigCanvas.addEventListener('touchmove', drawSig, { passive: false });
    window.addEventListener('touchend', () => { if (isDrawingSig) { isDrawingSig = false; saveSig(); } });
    
    document.getElementById('clearSignatureBtn').addEventListener('click', () => {
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      signatureData = null;
      renderPreview();
    });
  }

  // ---------- INIT ----------
  addRow();
  renderPreview();

})();
