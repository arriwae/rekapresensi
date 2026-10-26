# PresensiPro - Modul Pengolahan & Rekapitulasi Presensi Karyawan

Aplikasi web modern, intuitif, dan berkinerja tinggi untuk memproses, memvalidasi, menganalisis, dan merekapitulasi data presensi karyawan hasil ekspor CSV sistem kehadiran secara **100% lokal di browser pengguna**.

Tidak ada data karyawan yang dikirimkan ke server eksternal, menjamin kerahasiaan dan kepatuhan privasi data instansi.

---

## 🚀 Fitur Utama

### 1. Impor Data Presensi Fleksibel
- **Unggah Cepat:** Drag-and-drop atau pemilih file untuk berkas CSV.
- **Deteksi Otomatis:**
  - Mengenali langsung kolom: `Karyawan`, `Jabatan/Posisi`, `Tanggal`, `Waktu Masuk`, `Waktu Keluar`, `Status`, `Presensi Masuk Status`, `Presensi Keluar Status`, `Dinas Luar`, `Unit Kerja`, `Lokasi`, `Presensi`, `Timezone`.
  - Deteksi delimiter otomatis (koma `,`, titik koma `;`, tab `\t`, pipe `|`).
  - Deteksi format tanggal multi-standar (`YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, nama bulan teks).
- **Pratinjau & Validasi:** Pratinjau 10 baris pertama sebelum data disimpan ke database.
- **Deteksi Duplikasi Cerdas:** Menggunakan kandidat kunci komposit `(Karyawan/ID + Tanggal + Lokasi/Unit)` dengan pilihan strategi: *Perbarui (Overwrite)* atau *Lewati (Skip)*.
- **Riwayat Impor:** Memantau batch berkas yang pernah diimpor dengan kemampuan hapus/rollback data spesifik.

### 2. Aturan Perhitungan & Analisis Status
- **Status Utama:** Kolom `Status` digunakan sebagai sumber primer (`Hadir`, `Tidak Hadir`, `Hari Libur`, `Izin`, `Sakit`, `Dinas Luar`, `Perlu Ditinjau`).
- **Pengecualian Hari Libur:** Status `Hari Libur` tidak pernah dihitung sebagai ketidakhadiran dan tidak dimasukkan ke dalam penyebut persentase kehadiran.
- **Rumus Kehadiran:**
  $$\text{Persentase Kehadiran} = \left(\frac{\text{Jumlah Hadir Efektif}}{\text{Hari Kerja Berlaku}}\right) \times 100\%$$
- **Kebijakan Dinas Luar yang Dapat Disesuaikan:** Tersedia pengaturan apakah status `Dinas Luar` dihitung sebagai kehadiran efektif (`Hadir + Dinas Luar`) atau dipisahkan.
- **Analisis Kedisiplinan:**
  - Status Masuk: `Tepat Waktu`, `Terlambat`, `Melebihi Toleransi`, `Tidak Hadir`.
  - Status Keluar: `Tepat Waktu`, `Pulang Awal`, `Tidak Hadir`.
  - Membedakan statistik **total kejadian keterlambatan** dan **jumlah karyawan unik yang pernah terlambat**.
  - Nilai waktu `-` ditangani secara aman sebagai data tidak tersedia (*unavailable*), bukan error.

### 3. Dashboard Analisis & Visualisasi Lengkap
- **10 Kartu Statistik Utama:**
  1. Total Karyawan Unik (bukan jumlah baris)
  2. Total Catatan Presensi
  3. Jumlah Hadir
  4. Jumlah Tidak Hadir
  5. Jumlah Izin
  6. Jumlah Sakit
  7. Jumlah Dinas Luar
  8. Jumlah Hari Libur
  9. Jumlah Karyawan Terlambat (dan total kejadian)
  10. Jumlah Karyawan Pulang Awal (dan total kejadian)
- **6 Grafik Interaktif (Chart.js):**
  1. Distribusi Status Presensi (Donut)
  2. Tren Kehadiran Harian (Line)
  3. Peringkat Kehadiran Karyawan (Bar)
  4. Perbandingan Berdasarkan Jabatan (Bar)
  5. Perbandingan Berdasarkan Unit Kerja / Departemen (Grouped Bar)
  6. Tren Keterlambatan dan Pulang Awal (Line)

### 4. Rekap Individual Karyawan
- Tabel rekapitulasi perorangan dengan sorting, pagination, dan progress bar tingkat kehadiran.
- Modal detail karyawan menampilkan seluruh riwayat presensi harian per tanggal, jam masuk, jam keluar, durasi, status kedatangan, dan status kepulangan.

### 5. Perbandingan Antarbulan (Month-to-Month Analysis)
- Memilih dua bulan untuk dibandingkan secara berdampingan.
- Menghitung indikator delta pertumbuhan (kenaikan/penurunan persentase kehadiran, penurunan kejadian terlambat, dll.).

### 6. Pusat Ekspor Laporan (8 Format CSV Standar)
1. Rekap Keseluruhan
2. Rekap Setiap Karyawan
3. Rekap Harian
4. Rekap Bulanan
5. Rekap per Jabatan
6. Rekap per Unit Kerja
7. Rekap Keterlambatan dan Pulang Awal
8. Data yang Perlu Ditinjau
*Semua berkas ekspor menyertakan metadata waktu unduh dan filter aktif dalam header dokumen.*

### 7. Keandalan Teknis & Offline
- Penyimpanan lokal menggunakan **IndexedDB**.
- **Backup & Restore:** Unduh seluruh data ke file JSON cadangan dan pulihkan kapan saja.
- **PWA & Offline Service Worker:** Aplikasi tetap dapat diakses meskipun tanpa koneksi internet.
- **Pusat Pengujian Otomatis:** Menguji 5 kasus khusus (*Hari Libur*, `-` pada waktu, multi-rekaman karyawan, data duplikat, dan status anomali).

---

## 💻 Cara Menjalankan Secara Lokal

### Menggunakan Laragon (Direktori Aktif)
Aplikasi ini berada di `c:\laragon\www\rekappresensi`. Jika Laragon aktif:
1. Buka browser Anda.
2. Akses alamat:
   ```
   http://localhost/rekappresensi/
   ```

### Menggunakan PHP Built-in Server
Jalankan perintah berikut di terminal:
```bash
php -S localhost:8000
```
Lalu buka browser di `http://localhost:8000`.

---

## 🌐 Deploy ke GitHub Pages

Karena aplikasi ini sepenuhnya statis (HTML, CSS, Vanilla JS, IndexedDB) dan aset Chart.js telah diunduh secara lokal di folder `vendor/`:

1. Buat repositori baru di GitHub (misal: `rekappresensi`).
2. Lakukan git init dan push:
   ```bash
   git init
   git add .
   git commit -m "Initial release of PresensiPro"
   git branch -M main
   git remote add origin https://github.com/USERNAME/rekappresensi.git
   git push -u origin main
   ```
3. Buka menu **Settings** > **Pages** di repositori GitHub Anda.
4. Pilih sumber build: **Deploy from a branch**, pilih branch `main` dan folder `/ (root)`.
5. Aplikasi akan aktif di `https://USERNAME.github.io/rekappresensi/`.

---

## 📂 Struktur Berkas

```
rekappresensi/
├── index.html                   # Halaman utama aplikasi (Single Page App)
├── manifest.json                # Web App Manifest untuk PWA
├── sw.js                        # Service Worker untuk dukungan 100% offline
├── README.md                    # Dokumentasi lengkap
├── css/
│   ├── styles.css               # Desain sistem, warna tema, layout, tipografi
│   └── components.css           # Komponen kartu, tabel, modal, badge, tombol
├── js/
│   ├── icons.js                 # Helper ikon SVG inline (tanpa font eksternal)
│   ├── csv-parser.js            # Parser CSV, deteksi delimiter & format tanggal
│   ├── attendance-rules.js      # Logika perhitungan status, hari kerja, dan kehadiran
│   ├── db.js                    # Layer IndexedDB, deduplikasi & cadangan data
│   ├── state.js                 # Reactive state management & filtering
│   ├── ui-importer.js           # UI Impor berkas, pratinjau & riwayat batch
│   ├── ui-dashboard.js          # Kartu KPI & grafik Chart.js
│   ├── ui-employees.js          # Rekap tabel karyawan & modal rincian log
│   ├── ui-comparison.js         # Analisis perbandingan antarbulan
│   ├── ui-export.js             # Generator ekspor 8 laporan CSV
│   ├── ui-settings.js           # Pengaturan kebijakan & backup/restore
│   ├── test-suite.js            # Rangkaian pengujian otomatis edge cases
│   └── app.js                   # Inisialisasi utama aplikasi
├── vendor/
│   └── chart.umd.min.js         # Chart.js lokal untuk dukungan offline penuh
└── sample-data/
    ├── generate_samples.php     # Skrip pembuat data sampel uji
    ├── presensi_oktober_2026.csv
    ├── presensi_november_2026.csv
    └── presensi_edge_cases_test.csv
```
