/**
 * PresensiPro - Policy Configurations & Backup/Restore Manager
 * Controls organization policies (Dinas Luar, Toleransi), theme preferences, and data backup/restore.
 */

const UISettings = {
  init() {
    this.bindEvents();
    this.loadCurrentSettings();

    AppState.subscribe('SETTINGS_CHANGED', (settings) => {
      this.syncInputs(settings);
    });
  },

  bindEvents() {
    // Policy toggle 1: Dinas Luar as Hadir
    const toggleDinas = document.getElementById('settingDinasLuarAsHadir');
    if (toggleDinas) {
      toggleDinas.addEventListener('change', (e) => {
        AppState.updateSettings({ dinasLuarAsHadir: e.target.checked });
        showToast('Kebijakan Diperbarui', `Dinas Luar sekarang ${e.target.checked ? 'dihitung' : 'TIDAK dihitung'} sebagai kehadiran.`, 'info');
      });
    }

    // Policy toggle 2: Combine Toleransi with Terlambat
    const toggleToleransi = document.getElementById('settingCombineTolerance');
    if (toggleToleransi) {
      toggleToleransi.addEventListener('change', (e) => {
        AppState.updateSettings({ combineToleranceWithLate: e.target.checked });
        showToast('Kebijakan Diperbarui', `Melebihi Toleransi sekarang ${e.target.checked ? 'digabungkan ke' : 'dipisahkan dari'} kategori Terlambat.`, 'info');
      });
    }

    // Theme toggle button in header & settings
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });

    // Backup download button
    document.getElementById('btnDownloadBackup')?.addEventListener('click', () => this.downloadBackup());

    // Restore trigger and file input
    const restoreInput = document.getElementById('restoreFileInput');
    document.getElementById('btnTriggerRestore')?.addEventListener('click', () => {
      restoreInput?.click();
    });

    if (restoreInput) {
      restoreInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.executeRestore(e.target.files[0]);
        }
      });
    }

    // Clear all data button
    document.getElementById('btnClearAllData')?.addEventListener('click', () => this.confirmClearAll());
  },

  loadCurrentSettings() {
    this.syncInputs(AppState.settings);
    this.applyTheme(AppState.settings.theme || 'dark');
  },

  syncInputs(settings) {
    const toggleDinas = document.getElementById('settingDinasLuarAsHadir');
    if (toggleDinas) toggleDinas.checked = Boolean(settings.dinasLuarAsHadir);

    const toggleToleransi = document.getElementById('settingCombineTolerance');
    if (toggleToleransi) toggleToleransi.checked = Boolean(settings.combineToleranceWithLate);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    AppState.updateSettings({ theme: next });
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIconContainers = document.querySelectorAll('.theme-icon-container');
    themeIconContainers.forEach(el => {
      el.innerHTML = theme === 'dark' ? getIcon('sun') : getIcon('moon');
    });
  },

  async downloadBackup() {
    try {
      showToast('Membuat Cadangan', 'Mengambil semua data dari IndexedDB...', 'info');
      const backup = await AppDB.exportBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_PresensiPro_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Cadangan Selesai', `File cadangan berisi ${backup.recordCount} catatan berhasil diunduh.`, 'success');
    } catch (err) {
      showToast('Gagal Cadangkan', err.message, 'danger');
    }
  },

  async executeRestore(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupObj = JSON.parse(e.target.result);
        if (confirm(`Pulihkan cadangan dari ${new Date(backupObj.exportedAt || Date.now()).toLocaleDateString('id-ID')} dengan ${backupObj.recordCount || 0} catatan? Tindakan ini akan menimpa data yang ada saat ini.`)) {
          await AppDB.importRestore(backupObj, 'overwrite');
          await AppState.loadFromDB();
          showToast('Pemulihan Sukses', 'Database berhasil dipulihkan dari file cadangan.', 'success');
        }
      } catch (err) {
        showToast('Gagal Memulihkan', 'Format file cadangan tidak valid atau rusak: ' + err.message, 'danger');
      }
    };
    reader.readAsText(file);
  },

  async confirmClearAll() {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh database? Semua catatan presensi dan riwayat impor akan dihapus permanen!')) {
      try {
        await AppDB.clearAllData();
        await AppState.loadFromDB();
        showToast('Database Dikosongkan', 'Semua data telah berhasil dihapus.', 'info');
      } catch (err) {
        showToast('Gagal Menghapus', err.message, 'danger');
      }
    }
  }
};
