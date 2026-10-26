/**
 * PresensiPro - CSV Import Module UI
 * Manages Drag-and-Drop, Parsing Preview, Duplicate Resolution, and Import History.
 */

const UIImporter = {
  currentParsedResult: null,
  currentFile: null,

  init() {
    this.bindEvents();
    this.renderHistory();

    AppState.subscribe('RECORDS_LOADED', () => {
      this.renderHistory();
    });
  },

  bindEvents() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('csvFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      ['dragleave', 'dragend'].forEach(type => {
        dropzone.addEventListener(type, () => dropzone.classList.remove('dragover'));
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileSelected(e.target.files[0]);
        }
      });
    }

    // Sample data loader buttons
    document.getElementById('btnLoadSampleOct')?.addEventListener('click', () => {
      this.loadSampleFile('sample-data/presensi_oktober_2026.csv', 'presensi_oktober_2026.csv');
    });

    document.getElementById('btnLoadSampleNov')?.addEventListener('click', () => {
      this.loadSampleFile('sample-data/presensi_november_2026.csv', 'presensi_november_2026.csv');
    });

    document.getElementById('btnLoadSampleEdge')?.addEventListener('click', () => {
      this.loadSampleFile('sample-data/presensi_edge_cases_test.csv', 'presensi_edge_cases_test.csv');
    });

    // Confirmation buttons
    document.getElementById('btnCancelImport')?.addEventListener('click', () => {
      this.closePreviewModal();
    });

    document.getElementById('btnConfirmImport')?.addEventListener('click', () => {
      this.executeImport();
    });
  },

  async loadSampleFile(url, filename) {
    try {
      showToast('Memuat Berkas', `Mengambil contoh berkas ${filename}...`, 'info');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gagal memuat file: ${res.statusText}`);
      const text = await res.text();
      this.currentFile = { name: filename, size: text.length };
      this.processCSVContent(text, filename);
    } catch (err) {
      showToast('Gagal Memuat Contoh', err.message, 'danger');
    }
  },

  handleFileSelected(file) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      showToast('Format Tidak Sesuai', 'Silakan pilih file berekstensi .csv', 'warning');
      return;
    }

    this.currentFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      this.processCSVContent(content, file.name);
    };

    reader.onerror = () => {
      showToast('Gagal Membaca File', 'Terjadi kesalahan saat membaca file.', 'danger');
    };

    reader.readAsText(file);
  },

  async processCSVContent(text, filename) {
    try {
      const parsed = CSVParser.parse(text);
      this.currentParsedResult = parsed;

      // Analyze duplicates against database
      const dupCheck = await AppDB.checkDuplicates(parsed.dataRows);
      parsed.dupCheck = dupCheck;

      // Count status distribution in incoming data
      let reviewCount = 0;
      for (const row of parsed.dataRows) {
        if (AttendanceRules.mapStatus(row.status) === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU) {
          reviewCount++;
        }
      }
      parsed.reviewCount = reviewCount;

      this.showPreviewModal(parsed, filename);
    } catch (err) {
      showToast('Kesalahan Parsing CSV', err.message, 'danger');
      console.error(err);
    }
  },

  showPreviewModal(parsed, filename) {
    const modal = document.getElementById('importPreviewModal');
    if (!modal) return;

    // Render Detection Badges
    document.getElementById('previewFileName').textContent = filename;
    document.getElementById('previewDelimiter').textContent = `Delimiter: "${parsed.delimiter === '\t' ? 'TAB' : parsed.delimiter}"`;
    document.getElementById('previewDateFormat').textContent = `Format Tgl: ${parsed.detectedDateFormat}`;
    document.getElementById('previewTotalRows').textContent = `${parsed.totalRows.toLocaleString()} baris data`;
    document.getElementById('previewUniqueEmployees').textContent = `${parsed.uniqueEmployeeCount} karyawan unik`;
    document.getElementById('previewDateRange').textContent = `${parsed.minDate || '—'} s/d ${parsed.maxDate || '—'}`;

    // Duplicate and Review Alerts
    const dupBadge = document.getElementById('previewDuplicateBadge');
    const totalDuplicates = parsed.dupCheck.existingDbDuplicateCount + parsed.dupCheck.intraFileDuplicateCount;
    if (totalDuplicates > 0) {
      dupBadge.innerHTML = `<span class="badge badge-izin">${getIcon('alertTriangle')} Ditemukan ${totalDuplicates} Duplikat (${parsed.dupCheck.existingDbDuplicateCount} sudah di DB, ${parsed.dupCheck.intraFileDuplicateCount} dalam berkas)</span>`;
      document.getElementById('duplicateStrategyContainer').style.display = 'block';
    } else {
      dupBadge.innerHTML = `<span class="badge badge-hadir">${getIcon('checkCircle')} Tidak ada duplikat terdeteksi</span>`;
      document.getElementById('duplicateStrategyContainer').style.display = 'none';
    }

    const reviewBadge = document.getElementById('previewReviewBadge');
    if (parsed.reviewCount > 0) {
      reviewBadge.innerHTML = `<span class="badge badge-review">${getIcon('alertCircle')} ${parsed.reviewCount} Baris Perlu Ditinjau</span>`;
    } else {
      reviewBadge.innerHTML = '';
    }

    // Render Preview Table (first 10 rows)
    const tbody = document.getElementById('previewTableBody');
    tbody.innerHTML = '';

    for (const row of parsed.previewRows) {
      const tr = document.createElement('tr');
      const mappedStatus = AttendanceRules.mapStatus(row.status);
      const mappedEntry = AttendanceRules.mapEntryStatus(row.presensi_masuk_status);
      const mappedExit = AttendanceRules.mapExitStatus(row.presensi_keluar_status);

      let statusBadgeClass = 'badge-hadir';
      if (mappedStatus === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) statusBadgeClass = 'badge-tidak-hadir';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.HARI_LIBUR) statusBadgeClass = 'badge-hari-libur';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.IZIN) statusBadgeClass = 'badge-izin';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.SAKIT) statusBadgeClass = 'badge-sakit';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.DINAS_LUAR) statusBadgeClass = 'badge-dinas-luar';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU) statusBadgeClass = 'badge-review';

      tr.innerHTML = `
        <td><strong>${escapeHtml(row.karyawan)}</strong><br><small class="text-dim">${escapeHtml(row.jabatan)}</small></td>
        <td>${row.tanggal}</td>
        <td>${row.waktu_masuk || '<span class="text-dim">-</span>'}</td>
        <td>${row.waktu_keluar || '<span class="text-dim">-</span>'}</td>
        <td><span class="badge ${statusBadgeClass}"><span class="badge-dot"></span>${mappedStatus}</span></td>
        <td><small>${mappedEntry}</small></td>
        <td><small>${mappedExit}</small></td>
        <td><small>${escapeHtml(row.lokasi)}</small></td>
      `;
      tbody.appendChild(tr);
    }

    modal.classList.add('active');
  },

  closePreviewModal() {
    const modal = document.getElementById('importPreviewModal');
    if (modal) modal.classList.remove('active');
    this.currentParsedResult = null;
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) fileInput.value = '';
  },

  async executeImport() {
    if (!this.currentParsedResult) return;

    const btnConfirm = document.getElementById('btnConfirmImport');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `${getIcon('refresh', 'spin')} Menyimpan ke IndexedDB...`;

    try {
      const strategyRadio = document.querySelector('input[name="duplicateStrategy"]:checked');
      const strategy = strategyRadio ? strategyRadio.value : 'overwrite';

      const batchId = 'batch_' + Date.now();
      const batchMeta = {
        id: batchId,
        filename: this.currentFile?.name || 'import.csv',
        importedAt: new Date().toISOString(),
        totalRows: this.currentParsedResult.totalRows,
        uniqueEmployees: this.currentParsedResult.uniqueEmployeeCount,
        minDate: this.currentParsedResult.minDate,
        maxDate: this.currentParsedResult.maxDate,
        reviewCount: this.currentParsedResult.reviewCount,
        strategy
      };

      const result = await AppDB.saveBatchWithRecords(
        batchMeta,
        this.currentParsedResult.dataRows,
        strategy
      );

      showToast(
        'Impor Berhasil Disimpan',
        `Berhasil menyimpan ${result.savedCount} catatan (${result.overwrittenCount} diperbarui, ${result.skippedCount} dilewati).`,
        'success'
      );

      this.closePreviewModal();
      await AppState.loadFromDB();
      this.renderHistory();

      // Navigate to dashboard tab to see updated results immediately
      document.querySelector('[data-tab="tabDashboard"]')?.click();
    } catch (err) {
      showToast('Gagal Menyimpan Data', err.message, 'danger');
      console.error(err);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = `${getIcon('checkCircle')} Simpan Data Presensi`;
    }
  },

  async renderHistory() {
    const tbody = document.getElementById('importHistoryBody');
    if (!tbody) return;

    const batches = await AppDB.getBatches();
    tbody.innerHTML = '';

    if (batches.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            Belum ada riwayat impor data. Silakan unggah file CSV di atas atau gunakan tombol contoh berkas.
          </td>
        </tr>
      `;
      return;
    }

    for (const b of batches) {
      const tr = document.createElement('tr');
      const dateFormatted = new Date(b.importedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      tr.innerHTML = `
        <td><strong>${escapeHtml(b.filename)}</strong></td>
        <td><small>${dateFormatted}</small></td>
        <td><strong>${(b.savedCount || b.totalRows).toLocaleString()}</strong> baris</td>
        <td>${b.uniqueEmployees} karyawan</td>
        <td><small class="badge badge-hadir">${b.minDate || '—'} s/d ${b.maxDate || '—'}</small></td>
        <td>${b.reviewCount > 0 ? `<span class="badge badge-review">${b.reviewCount} Ditinjau</span>` : '<span class="badge badge-hadir">Valid</span>'}</td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-sm text-danger" title="Hapus berkas ini" onclick="UIImporter.deleteBatchConfirm('${b.id}', '${escapeHtml(b.filename)}')">
            ${getIcon('trash')} Hapus
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  },

  async deleteBatchConfirm(batchId, filename) {
    if (confirm(`Apakah Anda yakin ingin menghapus data impor "${filename}"? Semua catatan terkait akan dihapus dari database.`)) {
      try {
        await AppDB.deleteBatch(batchId);
        showToast('Berkas Dihapus', `Data impor ${filename} berhasil dihapus.`, 'info');
        await AppState.loadFromDB();
        this.renderHistory();
      } catch (err) {
        showToast('Gagal Menghapus', err.message, 'danger');
      }
    }
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
