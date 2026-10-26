/**
 * PresensiPro - Report Export Hub
 * Exports 8 required CSV report formats with rich metadata headers, timestamp, and active filter context.
 */

const UIExport = {
  init() {
    this.bindEvents();
  },

  bindEvents() {
    const exportMap = [
      { id: 'btnExportSummary', type: 'summary' },
      { id: 'btnExportEmployees', type: 'employees' },
      { id: 'btnExportDaily', type: 'daily' },
      { id: 'btnExportMonthly', type: 'monthly' },
      { id: 'btnExportPosition', type: 'position' },
      { id: 'btnExportDepartment', type: 'department' },
      { id: 'btnExportPunctuality', type: 'punctuality' },
      { id: 'btnExportReview', type: 'review' }
    ];

    for (const item of exportMap) {
      document.getElementById(item.id)?.addEventListener('click', () => {
        this.generateReport(item.type);
      });
    }
  },

  /**
   * Helper to format active filters for CSV header & filename
   */
  getFilterMetadata() {
    const f = AppState.filters;
    const parts = [];
    if (f.yearMonth && f.yearMonth !== 'all') parts.push(`Bulan_${f.yearMonth}`);
    if (f.startDate || f.endDate) parts.push(`Tgl_${f.startDate || 'min'}_sd_${f.endDate || 'max'}`);
    if (f.karyawan && f.karyawan !== 'all') parts.push(`Karyawan_${f.karyawan.replace(/\s+/g, '_')}`);
    if (f.unit_kerja && f.unit_kerja !== 'all') parts.push(`Unit_${f.unit_kerja.replace(/\s+/g, '_')}`);
    return parts.length > 0 ? parts.join('-') : 'SemuaFilter';
  },

  /**
   * Download CSV string with UTF-8 BOM
   */
  downloadCSV(content, filename) {
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Ekspor Berhasil', `File ${filename} telah diunduh.`, 'success');
  },

  generateMetadataHeader(title) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
    const timeStr = now.toLocaleTimeString('id-ID');
    const f = AppState.filters;

    return [
      `# ==========================================`,
      `# LAPORAN: ${title}`,
      `# Tanggal Unduh: ${dateStr} ${timeStr}`,
      `# Filter Aktif: Bulan=${f.yearMonth || 'Semua'}, Unit=${f.unit_kerja || 'Semua'}, Lokasi=${f.lokasi || 'Semua'}`,
      `# Total Catatan Dianalisis: ${AppState.filteredRecords.length}`,
      `# ==========================================`,
      ``
    ].join('\n');
  },

  generateReport(type) {
    const records = AppState.filteredRecords;
    const metrics = AppState.computedMetrics;
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filterTag = this.getFilterMetadata();

    if (!records || records.length === 0) {
      showToast('Data Kosong', 'Tidak ada data untuk diekspor pada filter aktif.', 'warning');
      return;
    }

    switch (type) {
      case 'summary': {
        const header = this.generateMetadataHeader('Rekap Keseluruhan Presensi');
        const rows = [
          'Indikator,Nilai,Keterangan',
          `Total Karyawan Unik,${metrics.uniqueEmployeesCount},Karyawan terdaftar dalam data`,
          `Total Catatan Presensi,${metrics.totalRecords},Baris catatan valid`,
          `Hari Kerja yang Berlaku,${metrics.applicableWorkDays},Estimasi hari kerja valid (di luar hari libur)`,
          `Persentase Kehadiran Keseluruhan,${metrics.overallAttendanceRateFormatted},Rata-rata tertimbang`,
          `Jumlah Hadir,${metrics.countHadir},${metrics.hadirPct}%`,
          `Jumlah Tidak Hadir,${metrics.countTidakHadir},${metrics.tidakHadirPct}%`,
          `Jumlah Izin,${metrics.countIzin},${metrics.izinPct}%`,
          `Jumlah Sakit,${metrics.countSakit},${metrics.sakitPct}%`,
          `Jumlah Dinas Luar,${metrics.countDinasLuar},${metrics.dinasLuarPct}%`,
          `Jumlah Hari Libur,${metrics.countHariLibur},${metrics.hariLiburPct}%`,
          `Karyawan Pernah Terlambat,${metrics.uniqueLateEmployeesCount},Karyawan unik`,
          `Total Kejadian Terlambat,${metrics.lateOccurrences},Kejadian`,
          `Karyawan Pernah Pulang Awal,${metrics.uniqueEarlyLeaveEmployeesCount},Karyawan unik`,
          `Total Kejadian Pulang Awal,${metrics.earlyLeaveOccurrences},Kejadian`,
          `Data Perlu Ditinjau,${metrics.countPerluDitinjau},Perlu koreksi status`
        ];
        this.downloadCSV(header + rows.join('\n'), `Rekap_Keseluruhan_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'employees': {
        const header = this.generateMetadataHeader('Rekap Presensi Setiap Karyawan');
        const csvRows = [
          'ID Karyawan,Nama Karyawan,Jabatan,Unit Kerja,Lokasi,Hari Kerja Berlaku,Hadir,Tidak Hadir,Izin,Sakit,Dinas Luar,Hari Libur,Kejadian Terlambat,Kejadian Pulang Awal,Persentase Kehadiran'
        ];
        for (const emp of metrics.employees) {
          csvRows.push([
            `"${emp.id || ''}"`,
            `"${emp.nama}"`,
            `"${emp.jabatan}"`,
            `"${emp.unit_kerja}"`,
            `"${emp.lokasi}"`,
            emp.applicableWorkDays,
            emp.hadir,
            emp.tidakHadir,
            emp.izin,
            emp.sakit,
            emp.dinasLuar,
            emp.hariLibur,
            emp.lateOccurrences,
            emp.earlyLeaveOccurrences,
            `"${emp.attendanceRateFormatted}"`
          ].join(','));
        }
        this.downloadCSV(header + csvRows.join('\n'), `Rekap_Setiap_Karyawan_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'daily': {
        const header = this.generateMetadataHeader('Rekap Harian Presensi');
        const dateMap = {};
        for (const r of records) {
          if (!dateMap[r.tanggal]) {
            dateMap[r.tanggal] = { total: 0, hadir: 0, tidakHadir: 0, izin: 0, sakit: 0, dinas: 0, libur: 0, late: 0, early: 0 };
          }
          const item = dateMap[r.tanggal];
          item.total++;
          const st = AttendanceRules.mapStatus(r.status);
          if (st === AttendanceRules.STATUS_KEYS.HADIR) item.hadir++;
          else if (st === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) item.tidakHadir++;
          else if (st === AttendanceRules.STATUS_KEYS.IZIN) item.izin++;
          else if (st === AttendanceRules.STATUS_KEYS.SAKIT) item.sakit++;
          else if (st === AttendanceRules.STATUS_KEYS.DINAS_LUAR) item.dinas++;
          else if (st === AttendanceRules.STATUS_KEYS.HARI_LIBUR) item.libur++;

          if (AttendanceRules.isLate(AttendanceRules.mapEntryStatus(r.presensi_masuk_status), AppState.settings)) item.late++;
          if (AttendanceRules.isEarlyLeave(AttendanceRules.mapExitStatus(r.presensi_keluar_status))) item.early++;
        }

        const sortedDates = Object.keys(dateMap).sort();
        const csvRows = ['Tanggal,Total Catatan,Hadir,Tidak Hadir,Izin,Sakit,Dinas Luar,Hari Libur,Terlambat,Pulang Awal'];
        for (const d of sortedDates) {
          const itm = dateMap[d];
          csvRows.push([d, itm.total, itm.hadir, itm.tidakHadir, itm.izin, itm.sakit, itm.dinas, itm.libur, itm.late, itm.early].join(','));
        }
        this.downloadCSV(header + csvRows.join('\n'), `Rekap_Harian_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'monthly': {
        const header = this.generateMetadataHeader('Rekap Bulanan Presensi');
        const monthMap = {};
        for (const r of records) {
          const ym = r.tanggal.slice(0, 7);
          if (!monthMap[ym]) {
            monthMap[ym] = { total: 0, hadir: 0, tidakHadir: 0, izin: 0, sakit: 0, dinas: 0, libur: 0, late: 0 };
          }
          const itm = monthMap[ym];
          itm.total++;
          const st = AttendanceRules.mapStatus(r.status);
          if (st === AttendanceRules.STATUS_KEYS.HADIR) itm.hadir++;
          else if (st === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) itm.tidakHadir++;
          else if (st === AttendanceRules.STATUS_KEYS.IZIN) itm.izin++;
          else if (st === AttendanceRules.STATUS_KEYS.SAKIT) itm.sakit++;
          else if (st === AttendanceRules.STATUS_KEYS.DINAS_LUAR) itm.dinas++;
          else if (st === AttendanceRules.STATUS_KEYS.HARI_LIBUR) itm.libur++;

          if (AttendanceRules.isLate(AttendanceRules.mapEntryStatus(r.presensi_masuk_status), AppState.settings)) itm.late++;
        }

        const sortedMonths = Object.keys(monthMap).sort();
        const csvRows = ['Bulan,Total Catatan,Hadir,Tidak Hadir,Izin,Sakit,Dinas Luar,Hari Libur,Terlambat,Persentase Hadir'];
        for (const m of sortedMonths) {
          const itm = monthMap[m];
          const workingRecords = itm.total - itm.libur;
          const rate = workingRecords > 0 ? ((itm.hadir / workingRecords) * 100).toFixed(1) + '%' : '—';
          csvRows.push([m, itm.total, itm.hadir, itm.tidakHadir, itm.izin, itm.sakit, itm.dinas, itm.libur, itm.late, `"${rate}"`].join(','));
        }
        this.downloadCSV(header + csvRows.join('\n'), `Rekap_Bulanan_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'position': {
        const header = this.generateMetadataHeader('Rekap Presensi per Jabatan');
        const posMap = {};
        for (const r of records) {
          const p = r.jabatan || 'Lainnya';
          if (!posMap[p]) posMap[p] = { total: 0, hadir: 0, tidakHadir: 0, late: 0 };
          const itm = posMap[p];
          itm.total++;
          const st = AttendanceRules.mapStatus(r.status);
          if (st === AttendanceRules.STATUS_KEYS.HADIR) itm.hadir++;
          else if (st === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) itm.tidakHadir++;
          if (AttendanceRules.isLate(AttendanceRules.mapEntryStatus(r.presensi_masuk_status), AppState.settings)) itm.late++;
        }
        const csvRows = ['Jabatan/Posisi,Total Catatan,Hadir,Tidak Hadir,Terlambat,Tingkat Kehadiran (%)'];
        for (const [p, itm] of Object.entries(posMap)) {
          const rate = itm.total > 0 ? ((itm.hadir / itm.total) * 100).toFixed(1) : 0;
          csvRows.push([`"${p}"`, itm.total, itm.hadir, itm.tidakHadir, itm.late, rate].join(','));
        }
        this.downloadCSV(header + csvRows.join('\n'), `Rekap_Jabatan_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'department': {
        const header = this.generateMetadataHeader('Rekap Presensi per Unit Kerja');
        const deptMap = {};
        for (const r of records) {
          const d = r.unit_kerja || 'Umum';
          if (!deptMap[d]) deptMap[d] = { total: 0, hadir: 0, tidakHadir: 0, late: 0 };
          const itm = deptMap[d];
          itm.total++;
          const st = AttendanceRules.mapStatus(r.status);
          if (st === AttendanceRules.STATUS_KEYS.HADIR) itm.hadir++;
          else if (st === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) itm.tidakHadir++;
          if (AttendanceRules.isLate(AttendanceRules.mapEntryStatus(r.presensi_masuk_status), AppState.settings)) itm.late++;
        }
        const csvRows = ['Unit Kerja,Total Catatan,Hadir,Tidak Hadir,Terlambat,Tingkat Kehadiran (%)'];
        for (const [d, itm] of Object.entries(deptMap)) {
          const rate = itm.total > 0 ? ((itm.hadir / itm.total) * 100).toFixed(1) : 0;
          csvRows.push([`"${d}"`, itm.total, itm.hadir, itm.tidakHadir, itm.late, rate].join(','));
        }
        this.downloadCSV(header + csvRows.join('\n'), `Rekap_Unit_Kerja_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'punctuality': {
        const header = this.generateMetadataHeader('Rekap Keterlambatan dan Pulang Awal');
        const incidentRows = [
          'Karyawan,Jabatan,Unit Kerja,Tanggal,Waktu Masuk,Status Masuk,Waktu Keluar,Status Keluar,Lokasi'
        ];
        for (const r of records) {
          const entry = AttendanceRules.mapEntryStatus(r.presensi_masuk_status);
          const exit = AttendanceRules.mapExitStatus(r.presensi_keluar_status);
          const isLate = AttendanceRules.isLate(entry, AppState.settings);
          const isEarly = AttendanceRules.isEarlyLeave(exit);

          if (isLate || isEarly) {
            incidentRows.push([
              `"${r.karyawan}"`,
              `"${r.jabatan}"`,
              `"${r.unit_kerja}"`,
              r.tanggal,
              `"${r.waktu_masuk || '-'}"`,
              `"${entry}"`,
              `"${r.waktu_keluar || '-'}"`,
              `"${exit}"`,
              `"${r.lokasi}"`
            ].join(','));
          }
        }
        this.downloadCSV(header + incidentRows.join('\n'), `Rekap_Keterlambatan_PulangAwal_${dateStamp}_${filterTag}.csv`);
        break;
      }

      case 'review': {
        const header = this.generateMetadataHeader('Data Presensi Perlu Ditinjau');
        const reviewRows = [
          'Karyawan,Jabatan,Tanggal,Status Asli,Keterangan Presensi,Unit Kerja,Lokasi'
        ];
        for (const r of records) {
          if (AttendanceRules.mapStatus(r.status) === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU) {
            reviewRows.push([
              `"${r.karyawan}"`,
              `"${r.jabatan}"`,
              r.tanggal,
              `"${r.status}"`,
              `"${r.presensi || ''}"`,
              `"${r.unit_kerja}"`,
              `"${r.lokasi}"`
            ].join(','));
          }
        }
        this.downloadCSV(header + reviewRows.join('\n'), `Data_Perlu_Ditinjau_${dateStamp}_${filterTag}.csv`);
        break;
      }
    }
  },

  exportIndividualEmployee(emp) {
    const header = this.generateMetadataHeader(`Log Presensi Karyawan: ${emp.nama}`);
    const rows = [
      'Tanggal,Waktu Masuk,Waktu Keluar,Status Utama,Status Masuk,Status Keluar,Lokasi,Dinas Luar,Keterangan'
    ];
    for (const r of emp.records) {
      rows.push([
        r.tanggal,
        `"${r.waktu_masuk || '-'}"`,
        `"${r.waktu_keluar || '-'}"`,
        `"${AttendanceRules.mapStatus(r.status)}"`,
        `"${AttendanceRules.mapEntryStatus(r.presensi_masuk_status)}"`,
        `"${AttendanceRules.mapExitStatus(r.presensi_keluar_status)}"`,
        `"${r.lokasi}"`,
        `"${r.dinas_luar}"`,
        `"${r.presensi || ''}"`
      ].join(','));
    }
    const cleanName = emp.nama.replace(/\s+/g, '_');
    this.downloadCSV(header + rows.join('\n'), `Presensi_Detail_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`);
  }
};
