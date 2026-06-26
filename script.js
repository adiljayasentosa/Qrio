// ============================================================
// QRIO — script.js
// Struktur file:
//   1. Element references & state
//   2. Tipe konten QR (URL / PDF / WiFi / Contact / Email)
//   3. Preset style
//   4. Render utama (canvas)
//   5. Logo & badge dokumen
//   6. Export: PNG, SVG, PDF, Copy Image
//   7. Event listeners
// ============================================================

// ===== 1. ELEMENT REFERENCES =====
const contentFields  = document.getElementById('contentFields');
const contentError   = document.getElementById('contentError');
const typePills      = document.getElementById('typePills');
const presetGrid     = document.getElementById('presetGrid');

const fgColorInput   = document.getElementById('fgColor');
const bgColorInput   = document.getElementById('bgColor');
const sizeRange      = document.getElementById('sizeRange');
const sizeValueLabel = document.getElementById('sizeValue');

const logoInput      = document.getElementById('logoInput');
const removeLogoBtn  = document.getElementById('removeLogoBtn');
const logoSizeField  = document.getElementById('logoSizeField');
const logoSizeRange  = document.getElementById('logoSizeRange');
const logoSizeValueLabel = document.getElementById('logoSizeValue');
const docBadgeToggle = document.getElementById('docBadgeToggle');

const downloadBtn    = document.getElementById('downloadBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const copyImageBtn   = document.getElementById('copyImageBtn');
const resetBtn        = document.getElementById('resetBtn');

const canvas          = document.getElementById('qrCanvas');
const previewMessage  = document.getElementById('previewMessage');
const ctx              = canvas.getContext('2d');

// ===== STATE =====
let logoImage = null;
let currentType = 'url';
let currentPreset = 'minimal';
let lastQrMatrix = null; // { moduleCount } disimpan untuk keperluan export SVG

const QUIET_ZONE_MODULES = 2;
const RENDER_SCALE = 3; // render canvas 3x lebih detail untuk hasil download HD

const PRESETS = {
  minimal:  { fg: '#1a1a1a', bg: '#ffffff', shape: 'square',  accentFinder: false },
  modern:   { fg: '#15392a', bg: '#f6f3ec', shape: 'square',  accentFinder: false },
  rounded:  { fg: '#1f4e36', bg: '#ffffff', shape: 'rounded', accentFinder: false },
  premium:  { fg: '#15392a', bg: '#fafaf7', shape: 'rounded', accentFinder: true  }
};

const ACCENT_COLOR = '#b08d3e'; // warna aksen untuk finder-pattern preset "Premium"

// ===== 2. DEFINISI TIPE KONTEN =====
const CONTENT_TYPES = {
  url: {
    label: 'Link URL',
    fields: [
      { id: 'url', type: 'text', label: 'Link URL', placeholder: 'https://example.com' }
    ],
    build: (v) => v.url ? v.url.trim() : ''
  },
  pdf: {
    label: 'Link PDF',
    fields: [
      { id: 'pdfUrl', type: 'text', label: 'Link PDF', placeholder: 'Tempel link PDF dari Google Drive/Dropbox' }
    ],
    hint: 'QR tidak bisa menyimpan file PDF langsung (kapasitasnya terlalu kecil). Upload PDF ke Google Drive/Dropbox dulu, salin link-nya, lalu tempel di sini.',
    build: (v) => v.pdfUrl ? v.pdfUrl.trim() : ''
  },
  wifi: {
    label: 'WiFi',
    fields: [
      { id: 'ssid', type: 'text', label: 'Nama WiFi (SSID)', placeholder: 'Nama jaringan WiFi' },
      { id: 'wifiPassword', type: 'text', label: 'Password', placeholder: 'Password WiFi (kosongkan jika tanpa password)' },
      { id: 'encryption', type: 'select', label: 'Jenis Keamanan', options: [
          { value: 'WPA', text: 'WPA/WPA2' },
          { value: 'WEP', text: 'WEP' },
          { value: 'nopass', text: 'Tanpa Password' }
        ]
      }
    ],
    build: (v) => {
      const ssid = (v.ssid || '').trim();
      const pass = (v.wifiPassword || '').trim();
      const enc = v.encryption || 'WPA';
      const escaped = (s) => s.replace(/([\\;,:"])/g, '\\$1');
      if (enc === 'nopass') {
        return `WIFI:T:nopass;S:${escaped(ssid)};;`;
      }
      return `WIFI:T:${enc};S:${escaped(ssid)};P:${escaped(pass)};;`;
    }
  },
  contact: {
    label: 'Contact',
    fields: [
      { id: 'name', type: 'text', label: 'Nama', placeholder: 'Nama lengkap' },
      { id: 'phone', type: 'text', label: 'Nomor Telepon', placeholder: '+62812xxxxxxx' },
      { id: 'contactEmail', type: 'email', label: 'Email (opsional)', placeholder: 'nama@email.com' }
    ],
    build: (v) => {
      const name = (v.name || '').trim();
      const phone = (v.phone || '').trim();
      const email = (v.contactEmail || '').trim();
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}`;
      if (phone) vcard += `\nTEL:${phone}`;
      if (email) vcard += `\nEMAIL:${email}`;
      vcard += `\nEND:VCARD`;
      return vcard;
    }
  },
  email: {
    label: 'Email',
    fields: [
      { id: 'emailTo', type: 'email', label: 'Email Tujuan', placeholder: 'nama@email.com' },
      { id: 'subject', type: 'text', label: 'Subjek (opsional)', placeholder: 'Subjek email' },
      { id: 'body', type: 'text', label: 'Isi Pesan (opsional)', placeholder: 'Isi pesan singkat' }
    ],
    build: (v) => {
      const to = (v.emailTo || '').trim();
      const subject = encodeURIComponent(v.subject || '');
      const body = encodeURIComponent(v.body || '');
      let mailto = `mailto:${to}`;
      const params = [];
      if (v.subject) params.push(`subject=${subject}`);
      if (v.body) params.push(`body=${body}`);
      if (params.length) mailto += `?${params.join('&')}`;
      return mailto;
    }
  }
};

// ===== RENDER FORM KONTEN DINAMIS SESUAI TIPE =====
function renderContentFields(type) {
  const config = CONTENT_TYPES[type];
  contentFields.innerHTML = '';

  config.fields.forEach((f) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const label = document.createElement('label');
    label.setAttribute('for', f.id);
    label.textContent = f.label;
    wrapper.appendChild(label);

    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      f.options.forEach((opt) => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.text;
        input.appendChild(optionEl);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type;
      input.placeholder = f.placeholder || '';
    }
    input.id = f.id;
    input.addEventListener('input', renderQRCodeDebounced);
    if (f.type === 'select') input.addEventListener('change', renderQRCode);
    wrapper.appendChild(input);

    contentFields.appendChild(wrapper);
  });

  if (config.hint) {
    const hint = document.createElement('span');
    hint.className = 'field__hint';
    hint.textContent = config.hint;
    contentFields.appendChild(hint);
  }
}

function getContentValues() {
  const config = CONTENT_TYPES[currentType];
  const values = {};
  config.fields.forEach((f) => {
    const el = document.getElementById(f.id);
    if (el) values[f.id] = el.value;
  });
  return values;
}

function getContentString() {
  const config = CONTENT_TYPES[currentType];
  return config.build(getContentValues());
}

function isContentEmpty() {
  const config = CONTENT_TYPES[currentType];
  const values = getContentValues();
  if (currentType === 'wifi') return !values.ssid || !values.ssid.trim();
  if (currentType === 'contact') return !values.name || !values.name.trim();
  if (currentType === 'email') return !values.emailTo || !values.emailTo.trim();
  // url & pdf
  const firstFieldId = config.fields[0].id;
  return !values[firstFieldId] || !values[firstFieldId].trim();
}

// ===== DEBOUNCE HELPER =====
function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ===== 4. RENDER UTAMA =====
function renderQRCode() {
  contentError.textContent = '';

  if (isContentEmpty()) {
    clearCanvas();
    setMessage('Lengkapi kolom konten untuk membuat QR code.', false);
    setExportButtonsEnabled(false);
    return;
  }

  const text = getContentString();
  if (!text) {
    clearCanvas();
    setMessage('Lengkapi kolom konten untuk membuat QR code.', false);
    setExportButtonsEnabled(false);
    return;
  }

  try {
    const displaySize = parseInt(sizeRange.value, 10);
    const size = displaySize * RENDER_SCALE;
    const fg = fgColorInput.value;
    const bg = bgColorInput.value;
    const preset = PRESETS[currentPreset];

    const qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();
    lastQrMatrix = qr;

    drawQRToCanvas(qr, size, fg, bg, preset.shape, preset.accentFinder);

    if (logoImage) drawLogoOnCanvas(size);
    if (docBadgeToggle.checked) drawDocBadge(size);

    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';

    setExportButtonsEnabled(true);
    setMessage('QR code berhasil dibuat. Siap diunduh.', false);
  } catch (err) {
    console.error(err);
    clearCanvas();
    setExportButtonsEnabled(false);
    setMessage('Gagal membuat QR code. Coba persingkat isi konten atau periksa kembali input Anda.', true);
  }
}

const renderQRCodeDebounced = debounce(renderQRCode, 200);

function isFinderModule(row, col, moduleCount) {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= moduleCount - 7;
  const inBottomLeft = row >= moduleCount - 7 && col < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

function drawQRToCanvas(qr, size, fg, bg, shape, accentFinder) {
  const moduleCount = qr.getModuleCount();
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const moduleSize = size / totalModules;

  canvas.width = size;
  canvas.height = size;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qr.isDark(row, col)) continue;

      const x = (col + QUIET_ZONE_MODULES) * moduleSize;
      const y = (row + QUIET_ZONE_MODULES) * moduleSize;
      const isFinder = isFinderModule(row, col, moduleCount);

      ctx.fillStyle = (accentFinder && isFinder) ? ACCENT_COLOR : fg;

      if (isFinder || shape === 'square') {
        ctx.fillRect(x, y, Math.ceil(moduleSize + 0.5), Math.ceil(moduleSize + 0.5));
      } else {
        // mode 'rounded' untuk modul data (bukan finder pattern): gaya dot
        const cx = x + moduleSize / 2;
        const cy = y + moduleSize / 2;
        const r = (moduleSize / 2) * 0.88;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function clearCanvas() {
  canvas.width = canvas.width;
}

function setMessage(text, isError) {
  previewMessage.textContent = text;
  previewMessage.classList.toggle('is-error', isError);
}

function setExportButtonsEnabled(enabled) {
  downloadBtn.disabled = !enabled;
  downloadSvgBtn.disabled = !enabled;
  downloadPdfBtn.disabled = !enabled;
  copyImageBtn.disabled = !enabled;
}

// ===== 5. LOGO & BADGE DOKUMEN =====
function getLogoWidthRatio() {
  return parseInt(logoSizeRange.value, 10) / 100;
}

function drawLogoOnCanvas(size) {
  const logoBoxSize = size * getLogoWidthRatio();
  const padding = logoBoxSize * 0.22;
  const circleRadius = (logoBoxSize / 2) + padding;
  const centerX = size / 2;
  const centerY = size / 2;

  drawCircle(centerX, centerY, circleRadius, '#ffffff');
  drawCircleStroke(centerX, centerY, circleRadius, 'rgba(0,0,0,0.08)', Math.max(1, size * 0.0025));

  const naturalW = logoImage.naturalWidth || logoImage.width;
  const naturalH = logoImage.naturalHeight || logoImage.height;
  const aspectRatio = naturalW / naturalH;

  let drawW, drawH;
  if (aspectRatio >= 1) {
    drawW = logoBoxSize;
    drawH = logoBoxSize / aspectRatio;
  } else {
    drawH = logoBoxSize;
    drawW = logoBoxSize * aspectRatio;
  }

  const logoX = centerX - drawW / 2;
  const logoY = centerY - drawH / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius * 0.92, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(logoImage, logoX, logoY, drawW, drawH);
  ctx.restore();
}

function drawCircle(cx, cy, r, fillStyle) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCircleStroke(cx, cy, r, strokeStyle, lineWidth) {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawDocBadge(size) {
  const badgeSize = size * 0.16;
  const margin = size * 0.04;
  const cx = size - margin - badgeSize / 2;
  const cy = size - margin - badgeSize / 2;
  const radius = badgeSize / 2;

  drawCircle(cx, cy, radius, '#ffffff');
  drawCircleStroke(cx, cy, radius, 'rgba(0,0,0,0.1)', Math.max(1, size * 0.0025));

  const pageW = badgeSize * 0.46;
  const pageH = badgeSize * 0.58;
  const foldSize = pageW * 0.32;
  const pageX = cx - pageW / 2;
  const pageY = cy - pageH / 2;

  ctx.save();
  ctx.fillStyle = '#4285f4';
  ctx.beginPath();
  ctx.moveTo(pageX, pageY);
  ctx.lineTo(pageX + pageW - foldSize, pageY);
  ctx.lineTo(pageX + pageW, pageY + foldSize);
  ctx.lineTo(pageX + pageW, pageY + pageH);
  ctx.lineTo(pageX, pageY + pageH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#a8c7fa';
  ctx.beginPath();
  ctx.moveTo(pageX + pageW - foldSize, pageY);
  ctx.lineTo(pageX + pageW, pageY + foldSize);
  ctx.lineTo(pageX + pageW - foldSize, pageY + foldSize);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, badgeSize * 0.035);
  ctx.lineCap = 'round';
  const lineXStart = pageX + pageW * 0.18;
  const lineXEnd = pageX + pageW * 0.82;
  const lineYStep = pageH * 0.18;
  for (let i = 1; i <= 3; i++) {
    const ly = pageY + pageH * 0.42 + lineYStep * (i - 1);
    ctx.beginPath();
    ctx.moveTo(lineXStart, ly);
    ctx.lineTo(i === 3 ? pageX + pageW * 0.6 : lineXEnd, ly);
    ctx.stroke();
  }
  ctx.restore();
}

// ===== 6. EXPORT: PNG, SVG, PDF, COPY IMAGE =====
downloadBtn.addEventListener('click', () => {
  try {
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error(err);
    setMessage('Gagal mengunduh QR code sebagai PNG.', true);
  }
});

downloadPdfBtn.addEventListener('click', () => {
  try {
    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL('image/png');
    const qrSizePx = parseInt(sizeRange.value, 10);
    const mmPerPx = 0.264583;
    const qrSizeMm = qrSizePx * mmPerPx;
    const margin = 15;
    const pageSize = qrSizeMm + margin * 2;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageSize, pageSize] });
    pdf.addImage(imgData, 'PNG', margin, margin, qrSizeMm, qrSizeMm);
    pdf.save('qrcode.pdf');
  } catch (err) {
    console.error(err);
    setMessage('Gagal mengunduh QR code sebagai PDF.', true);
  }
});

downloadSvgBtn.addEventListener('click', () => {
  if (!lastQrMatrix) return;
  try {
    const svgString = buildSvgString(lastQrMatrix, parseInt(sizeRange.value, 10), fgColorInput.value, bgColorInput.value, PRESETS[currentPreset]);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qrcode.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    setMessage('Gagal mengunduh QR code sebagai SVG.', true);
  }
});

function buildSvgString(qr, displaySize, fg, bg, preset) {
  const moduleCount = qr.getModuleCount();
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const moduleSize = displaySize / totalModules;
  const shapes = [];

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qr.isDark(row, col)) continue;
      const x = (col + QUIET_ZONE_MODULES) * moduleSize;
      const y = (row + QUIET_ZONE_MODULES) * moduleSize;
      const isFinder = isFinderModule(row, col, moduleCount);
      const color = (preset.accentFinder && isFinder) ? ACCENT_COLOR : fg;

      if (isFinder || preset.shape === 'square') {
        shapes.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="${color}"/>`);
      } else {
        const cx = x + moduleSize / 2;
        const cy = y + moduleSize / 2;
        const r = (moduleSize / 2) * 0.88;
        shapes.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}"/>`);
      }
    }
  }

  // Catatan: logo & badge tidak diikutsertakan dalam SVG (akan butuh embed base64 image),
  // jadi untuk QR dengan logo, gunakan format PNG/PDF yang sudah pasti menyertakan logo.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${displaySize}" height="${displaySize}" viewBox="0 0 ${displaySize} ${displaySize}">
  <rect width="${displaySize}" height="${displaySize}" fill="${bg}"/>
  ${shapes.join('\n  ')}
</svg>`;
}

copyImageBtn.addEventListener('click', async () => {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      setMessage('Browser ini tidak mendukung salin gambar langsung. Gunakan tombol PNG sebagai gantinya.', true);
      return;
    }
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setMessage('QR code berhasil disalin ke clipboard.', false);
      } catch (err) {
        console.error(err);
        setMessage('Gagal menyalin gambar. Coba unduh sebagai PNG sebagai gantinya.', true);
      }
    }, 'image/png');
  } catch (err) {
    console.error(err);
    setMessage('Gagal menyalin gambar.', true);
  }
});

// ===== 7. EVENT LISTENERS LAINNYA =====

// --- Pilihan tipe QR ---
typePills.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  typePills.querySelectorAll('.pill').forEach((p) => p.classList.remove('is-active'));
  btn.classList.add('is-active');
  currentType = btn.dataset.type;
  renderContentFields(currentType);
  if (currentType === 'pdf') docBadgeToggle.checked = true;
  renderQRCode();
});

// --- Preset style ---
presetGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  presetGrid.querySelectorAll('.preset-btn').forEach((p) => p.classList.remove('is-active'));
  btn.classList.add('is-active');
  currentPreset = btn.dataset.preset;
  const preset = PRESETS[currentPreset];
  fgColorInput.value = preset.fg;
  bgColorInput.value = preset.bg;
  renderQRCode();
});

// --- Warna & ukuran ---
fgColorInput.addEventListener('input', renderQRCode);
bgColorInput.addEventListener('input', renderQRCode);
sizeRange.addEventListener('input', () => {
  sizeValueLabel.textContent = sizeRange.value;
  renderQRCode();
});

// --- Logo ---
logoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    setMessage('Format logo harus PNG atau JPG.', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      removeLogoBtn.disabled = false;
      logoSizeField.hidden = false;
      renderQRCode();
    };
    img.onerror = () => setMessage('Gagal memuat gambar logo.', true);
    img.src = event.target.result;
  };
  reader.onerror = () => setMessage('Gagal membaca file logo.', true);
  reader.readAsDataURL(file);
});

logoSizeRange.addEventListener('input', () => {
  logoSizeValueLabel.textContent = logoSizeRange.value;
  renderQRCode();
});

removeLogoBtn.addEventListener('click', () => {
  logoImage = null;
  logoInput.value = '';
  removeLogoBtn.disabled = true;
  logoSizeField.hidden = true;
  renderQRCode();
});

// --- Badge dokumen ---
docBadgeToggle.addEventListener('change', renderQRCode);

// --- Reset semua ---
resetBtn.addEventListener('click', () => {
  // Reset tipe ke URL
  typePills.querySelectorAll('.pill').forEach((p) => p.classList.remove('is-active'));
  typePills.querySelector('[data-type="url"]').classList.add('is-active');
  currentType = 'url';
  renderContentFields('url');

  // Reset preset ke minimal
  presetGrid.querySelectorAll('.preset-btn').forEach((p) => p.classList.remove('is-active'));
  presetGrid.querySelector('[data-preset="minimal"]').classList.add('is-active');
  currentPreset = 'minimal';
  fgColorInput.value = PRESETS.minimal.fg;
  bgColorInput.value = PRESETS.minimal.bg;

  sizeRange.value = 280;
  sizeValueLabel.textContent = 280;

  logoImage = null;
  logoInput.value = '';
  removeLogoBtn.disabled = true;
  logoSizeRange.value = 22;
  logoSizeValueLabel.textContent = 22;
  logoSizeField.hidden = true;

  docBadgeToggle.checked = false;
  contentError.textContent = '';

  clearCanvas();
  setExportButtonsEnabled(false);
  setMessage('Lengkapi kolom konten untuk membuat QR code.', false);
});

// ===== INIT =====
renderContentFields('url');
clearCanvas();
setExportButtonsEnabled(false);
