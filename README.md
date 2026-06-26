# 🟢 Qrio — QR Code Generator

**Scan Smarter, Share Faster.**

Qrio adalah generator QR code modern berbasis web yang berjalan 100% di browser — tanpa server, tanpa akun, tanpa biaya tersembunyi. Buat QR code dari URL, PDF, WiFi, kontak, atau email dalam hitungan detik, lengkap dengan logo brand di tengahnya.

🔗 **Demo:** _(tempel link hosting kamu di sini, misal Netlify/Vercel/GitHub Pages)_

---

## ✨ Fitur

- **5 Tipe Konten QR**
  - 🔗 URL — link biasa
  - 📄 PDF — link dokumen (Google Drive/Dropbox)
  - 📶 WiFi — scan langsung tersambung ke jaringan
  - 👤 Contact — kartu nama digital (vCard)
  - ✉️ Email — buka draf email otomatis
- **Kustomisasi tampilan** — warna foreground/background, ukuran QR
- **4 Preset gaya siap pakai** — Minimal, Modern, Rounded, Premium
- **Logo di tengah QR** — proporsi otomatis terjaga, tidak gepeng, dengan backdrop melingkar
- **Badge ikon dokumen** — penanda visual untuk QR tipe PDF/dokumen
- **Error correction level tinggi (H)** — QR tetap terbaca walau ditambah logo
- **4 format ekspor** — PNG (HD), SVG (vektor), PDF, dan salin langsung ke clipboard
- **Real-time preview** — perubahan langsung terlihat tanpa klik tombol apa pun
- **Responsif** — tampilan menyesuaikan otomatis di HP maupun desktop

## 🛠️ Tech Stack

Dibangun dengan **HTML, CSS, dan JavaScript vanilla** — tidak ada framework, tidak ada proses build, tidak ada `node_modules`.

| Library | Fungsi |
|---|---|
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) | Generate matriks QR code |
| [jsPDF](https://github.com/parallax/jsPDF) | Export ke format PDF |
| Canvas API & SVG | Render QR, logo, dan badge |

## 🚀 Cara Pakai

1. Clone atau download repo ini
2. Buka `index.html` lewat web server lokal (disarankan, bukan dobel klik langsung) — bisa pakai ekstensi **Live Server** di VS Code, atau hosting gratis seperti [Netlify Drop](https://app.netlify.com/drop)
3. Pilih tipe QR, isi kontennya, atur tampilan sesuai keinginan
4. Klik tombol unduh (PNG/SVG/PDF) atau salin langsung sebagai gambar

> ⚠️ Beberapa fitur (seperti salin gambar ke clipboard) butuh halaman diakses lewat `https://` atau `localhost`, tidak bisa lewat `file://`.

## 📁 Struktur File

```
qrio/
├── index.html      # Struktur halaman
├── style.css       # Seluruh styling & desain
├── script.js       # Logic generate QR, logo, export
└── logo.svg        # Logo brand Qrio
```

## 🙋 Kontribusi

Pull request dan saran fitur sangat terbuka. Silakan fork repo ini dan ajukan PR.

## 📜 Lisensi

MIT License — bebas dipakai, dimodifikasi, dan didistribusikan ulang.

## 👤 Dibuat oleh

**Fradil** — [GitHub](https://github.com/adiljayasentosa)

Kalau Qrio bermanfaat buat kamu, boleh banget [traktir kopi lewat Saweria](https://saweria.co/adiljayasentosa) ☕
