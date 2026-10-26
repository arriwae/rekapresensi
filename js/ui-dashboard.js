/**
 * PresensiPro - Dashboard Rekap & Visualizations
 * Renders 10 Required Stat Cards and 6 Chart.js Analytics Visualizations.
 */

const UIDashboard = {
  charts: {},

  init() {
    this.bindFilterEvents();

    AppState.subscribe('DATA_UPDATED', ({ metrics, filteredRecords }) => {
      this.renderStatCards(metrics);
      this.renderCharts(metrics, filteredRecords);
      this.updateActiveFilterSummary();
    });

    AppState.subscribe('RECORDS_LOADED', () => {
      this.populateFilterDropdowns();
    });
  },

  bindFilterEvents() {
    // Dropdown filters
    const filterIds = [
      { id: 'filterMonthYear', key: 'yearMonth' },
      { id: 'filterEmployee', key: 'karyawan' },
      { id: 'filterPosition', key: 'jabatan' },
      { id: 'filterDepartment', key: 'unit_kerja' },
      { id: 'filterLocation', key: 'lokasi' },
      { id: 'filterStatus', key: 'status' },
      { id: 'filterEntryStatus', key: 'presensi_masuk_status' },
      { id: 'filterExitStatus', key: 'presensi_keluar_status' }
    ];

    for (const item of filterIds) {
      const el = document.getElementById(item.id);
      if (el) {
        el.addEventListener('change', (e) => {
          AppState.setFilter(item.key, e.target.value);
        });
      }
    }

    // Date range inputs
    const startDateEl = document.getElementById('filterStartDate');
    const endDateEl = document.getElementById('filterEndDate');

    if (startDateEl) {
      startDateEl.addEventListener('change', (e) => {
        AppState.setFilter('startDate', e.target.value);
      });
    }

    if (endDateEl) {
      endDateEl.addEventListener('change', (e) => {
        AppState.setFilter('endDate', e.target.value);
      });
    }

    // Global search query input
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          AppState.setFilter('searchQuery', e.target.value);
        }, 250);
      });
    }

    // Reset filters button
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
      this.resetFilterInputs();
      AppState.resetFilters();
      showToast('Filter Direset', 'Semua filter telah dikembalikan ke kondisi awal.', 'info');
    });

    // Preset Date buttons
    document.getElementById('btnFilterThisMonth')?.addEventListener('click', () => {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthSelect = document.getElementById('filterMonthYear');
      if (monthSelect) monthSelect.value = ym;
      AppState.setFilter('yearMonth', ym);
    });

    document.getElementById('btnFilterAllData')?.addEventListener('click', () => {
      this.resetFilterInputs();
      AppState.resetFilters();
    });
  },

  resetFilterInputs() {
    const ids = [
      'filterMonthYear', 'filterEmployee', 'filterPosition',
      'filterDepartment', 'filterLocation', 'filterStatus',
      'filterEntryStatus', 'filterExitStatus', 'filterStartDate',
      'filterEndDate', 'globalSearchInput'
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') el.value = 'all';
        else el.value = '';
      }
    }
  },

  populateFilterDropdowns() {
    const opts = AppState.getDistinctFilterOptions();

    const populate = (id, list, placeholder) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = `<option value="all">${placeholder}</option>`;
      for (const val of list) {
        if (!val) continue;
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        sel.appendChild(opt);
      }
      if (list.includes(currentVal)) {
        sel.value = currentVal;
      }
    };

    // Format months nicely
    const monthSel = document.getElementById('filterMonthYear');
    if (monthSel) {
      const cur = monthSel.value;
      monthSel.innerHTML = '<option value="all">Semua Bulan</option>';
      const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      for (const ym of opts.months) {
        const [y, m] = ym.split('-');
        const opt = document.createElement('option');
        opt.value = ym;
        opt.textContent = `${monthNames[parseInt(m)]} ${y}`;
        monthSel.appendChild(opt);
      }
      if (opts.months.includes(cur)) monthSel.value = cur;
    }

    populate('filterEmployee', opts.employees, 'Semua Karyawan');
    populate('filterPosition', opts.positions, 'Semua Jabatan');
    populate('filterDepartment', opts.departments, 'Semua Unit Kerja');
    populate('filterLocation', opts.locations, 'Semua Lokasi');
  },

  updateActiveFilterSummary() {
    const container = document.getElementById('activeFilterSummary');
    if (!container) return;

    const f = AppState.filters;
    const activePills = [];

    if (f.yearMonth && f.yearMonth !== 'all') activePills.push(`Bulan: ${f.yearMonth}`);
    if (f.startDate || f.endDate) activePills.push(`Periode: ${f.startDate || 'Awal'} s/d ${f.endDate || 'Akhir'}`);
    if (f.karyawan && f.karyawan !== 'all') activePills.push(`Karyawan: ${f.karyawan}`);
    if (f.jabatan && f.jabatan !== 'all') activePills.push(`Jabatan: ${f.jabatan}`);
    if (f.unit_kerja && f.unit_kerja !== 'all') activePills.push(`Unit: ${f.unit_kerja}`);
    if (f.lokasi && f.lokasi !== 'all') activePills.push(`Lokasi: ${f.lokasi}`);
    if (f.status && f.status !== 'all') activePills.push(`Status: ${f.status}`);
    if (f.presensi_masuk_status && f.presensi_masuk_status !== 'all') activePills.push(`Masuk: ${f.presensi_masuk_status}`);
    if (f.presensi_keluar_status && f.presensi_keluar_status !== 'all') activePills.push(`Keluar: ${f.presensi_keluar_status}`);
    if (f.searchQuery) activePills.push(`Cari: "${f.searchQuery}"`);

    const countText = `Menampilkan <strong>${AppState.filteredRecords.length.toLocaleString()}</strong> dari <strong>${AppState.allRecords.length.toLocaleString()}</strong> catatan`;

    if (activePills.length === 0) {
      container.innerHTML = `<span class="text-muted" style="font-size: 0.8rem;">Filter Aktif: Default (Semua Data) &bull; ${countText}</span>`;
    } else {
      const pillsHtml = activePills.map(p => `<span class="badge badge-izin">${escapeHtml(p)}</span>`).join(' ');
      container.innerHTML = `<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span class="text-muted" style="font-size: 0.8rem;">Filter Aktif:</span>
        ${pillsHtml}
        <span class="text-muted" style="font-size: 0.8rem; margin-left: 0.5rem;">&bull; ${countText}</span>
      </div>`;
    }
  },

  renderStatCards(metrics) {
    if (!metrics) return;

    // 1. Total Karyawan Unik
    document.getElementById('statUniqueEmployees').textContent = metrics.uniqueEmployeesCount.toLocaleString();

    // 2. Total Catatan Presensi
    document.getElementById('statTotalRecords').textContent = metrics.totalRecords.toLocaleString();

    // 3. Jumlah Hadir
    document.getElementById('statHadir').textContent = metrics.countHadir.toLocaleString();
    document.getElementById('statHadirPct').textContent = `${metrics.hadirPct}%`;

    // 4. Jumlah Tidak Hadir
    document.getElementById('statTidakHadir').textContent = metrics.countTidakHadir.toLocaleString();
    document.getElementById('statTidakHadirPct').textContent = `${metrics.tidakHadirPct}%`;

    // 5. Jumlah Izin
    document.getElementById('statIzin').textContent = metrics.countIzin.toLocaleString();
    document.getElementById('statIzinPct').textContent = `${metrics.izinPct}%`;

    // 6. Jumlah Sakit
    document.getElementById('statSakit').textContent = metrics.countSakit.toLocaleString();
    document.getElementById('statSakitPct').textContent = `${metrics.sakitPct}%`;

    // 7. Jumlah Dinas Luar
    document.getElementById('statDinasLuar').textContent = metrics.countDinasLuar.toLocaleString();
    document.getElementById('statDinasLuarPct').textContent = `${metrics.dinasLuarPct}%`;

    // 8. Jumlah Hari Libur
    document.getElementById('statHariLibur').textContent = metrics.countHariLibur.toLocaleString();
    document.getElementById('statHariLiburPct').textContent = `${metrics.hariLiburPct}%`;

    // 9. Jumlah Karyawan Terlambat (Unique employees vs total occurrences)
    document.getElementById('statLateEmployees').textContent = metrics.uniqueLateEmployeesCount.toLocaleString();
    document.getElementById('statLateOccurrences').textContent = `${metrics.lateOccurrences} total kejadian`;

    // 10. Jumlah Karyawan Pulang Awal (Unique employees vs total occurrences)
    document.getElementById('statEarlyLeaveEmployees').textContent = metrics.uniqueEarlyLeaveEmployeesCount.toLocaleString();
    document.getElementById('statEarlyLeaveOccurrences').textContent = `${metrics.earlyLeaveOccurrences} total kejadian`;

    // Primary KPI: Persentase Kehadiran Keseluruhan
    const overallRateEl = document.getElementById('statOverallRate');
    if (overallRateEl) {
      overallRateEl.textContent = metrics.overallAttendanceRateFormatted;
    }

    const workDaysLabelEl = document.getElementById('statWorkDaysLabel');
    if (workDaysLabelEl) {
      workDaysLabelEl.innerHTML = `Hari Kerja Berlaku: <strong>${metrics.applicableWorkDays}</strong> hari <small class="text-dim">(Estimasi berdasarkan data kerja valid dalam file)</small>`;
    }

    // Problematic / Review Count alert
    const reviewCard = document.getElementById('statReviewContainer');
    if (reviewCard) {
      if (metrics.countPerluDitinjau > 0) {
        reviewCard.style.display = 'block';
        document.getElementById('statReviewCount').textContent = metrics.countPerluDitinjau;
      } else {
        reviewCard.style.display = 'none';
      }
    }
  },

  renderCharts(metrics, records) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js belum siap.');
      return;
    }

    this.renderStatusChart(metrics);
    this.renderDailyTrendChart(records);
    this.renderEmployeeRateChart(metrics);
    this.renderPositionComparisonChart(records);
    this.renderDepartmentComparisonChart(records);
    this.renderPunctualityTrendChart(records);
  },

  getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      textColor: isDark ? '#94a3b8' : '#475569',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipText: isDark ? '#f8fafc' : '#0f172a'
    };
  },

  // 1. Distribusi Status Presensi (Donut)
  renderStatusChart(metrics) {
    const ctx = document.getElementById('chartStatusDist');
    if (!ctx) return;
    if (this.charts.statusDist) this.charts.statusDist.destroy();

    const colors = this.getChartColors();
    this.charts.statusDist = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Hari Libur', 'Perlu Ditinjau'],
        datasets: [{
          data: [
            metrics.countHadir,
            metrics.countTidakHadir,
            metrics.countIzin,
            metrics.countSakit,
            metrics.countDinasLuar,
            metrics.countHariLibur,
            metrics.countPerluDitinjau
          ],
          backgroundColor: [
            '#10b981', // Hadir (Green)
            '#ef4444', // Tidak Hadir (Red)
            '#f59e0b', // Izin (Amber)
            '#06b6d4', // Sakit (Cyan)
            '#8b5cf6', // Dinas Luar (Purple)
            '#64748b', // Hari Libur (Gray)
            '#f43f5e'  // Perlu Ditinjau (Rose)
          ],
          borderWidth: 2,
          borderColor: 'transparent'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          }
        },
        cutout: '65%'
      }
    });
  },

  // 2. Tren Kehadiran Harian (Line)
  renderDailyTrendChart(records) {
    const ctx = document.getElementById('chartDailyTrend');
    if (!ctx) return;
    if (this.charts.dailyTrend) this.charts.dailyTrend.destroy();

    // Group counts by date
    const dateMap = {};
    for (const r of records) {
      if (!dateMap[r.tanggal]) {
        dateMap[r.tanggal] = { hadir: 0, tidakHadir: 0, libur: 0 };
      }
      const st = AttendanceRules.mapStatus(r.status);
      if (st === AttendanceRules.STATUS_KEYS.HADIR || (AppState.settings.dinasLuarAsHadir && st === AttendanceRules.STATUS_KEYS.DINAS_LUAR)) {
        dateMap[r.tanggal].hadir++;
      } else if (st === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) {
        dateMap[r.tanggal].tidakHadir++;
      } else if (st === AttendanceRules.STATUS_KEYS.HARI_LIBUR) {
        dateMap[r.tanggal].libur++;
      }
    }

    const sortedDates = Object.keys(dateMap).sort();
    const hadirData = sortedDates.map(d => dateMap[d].hadir);
    const tidakHadirData = sortedDates.map(d => dateMap[d].tidakHadir);
    const labels = sortedDates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    const colors = this.getChartColors();
    this.charts.dailyTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Hadir',
            data: hadirData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: labels.length > 20 ? 1.5 : 3
          },
          {
            label: 'Tidak Hadir',
            data: tidakHadirData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: labels.length > 20 ? 1 : 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          }
        },
        scales: {
          x: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor } },
          y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor }, beginAtZero: true }
        }
      }
    });
  },

  // 3. Persentase Kehadiran per Karyawan (Horizontal Bar)
  renderEmployeeRateChart(metrics) {
    const ctx = document.getElementById('chartEmployeeRates');
    if (!ctx) return;
    if (this.charts.employeeRates) this.charts.employeeRates.destroy();

    // Top 10 lowest or highest employees for clear presentation
    const employees = [...metrics.employees].sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0)).slice(0, 10);
    const names = employees.map(e => e.nama.length > 16 ? e.nama.slice(0, 15) + '…' : e.nama);
    const rates = employees.map(e => e.attendanceRate || 0);

    const colors = this.getChartColors();
    this.charts.employeeRates = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: 'Persentase Kehadiran (%)',
          data: rates,
          backgroundColor: rates.map(r => r >= 90 ? '#10b981' : (r >= 75 ? '#6366f1' : '#f59e0b')),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { max: 100, grid: { color: colors.gridColor }, ticks: { color: colors.textColor } },
          y: { grid: { display: false }, ticks: { color: colors.textColor, font: { size: 11 } } }
        }
      }
    });
  },

  // 4. Perbandingan Kehadiran Berdasarkan Jabatan (Bar)
  renderPositionComparisonChart(records) {
    const ctx = document.getElementById('chartPositionComparison');
    if (!ctx) return;
    if (this.charts.positionComp) this.charts.positionComp.destroy();

    const posMap = {};
    for (const r of records) {
      const pos = r.jabatan || 'Lainnya';
      if (!posMap[pos]) posMap[pos] = { total: 0, hadir: 0 };
      const st = AttendanceRules.mapStatus(r.status);
      if (st !== AttendanceRules.STATUS_KEYS.HARI_LIBUR) {
        posMap[pos].total++;
        if (st === AttendanceRules.STATUS_KEYS.HADIR || (AppState.settings.dinasLuarAsHadir && st === AttendanceRules.STATUS_KEYS.DINAS_LUAR)) {
          posMap[pos].hadir++;
        }
      }
    }

    const posList = Object.keys(posMap);
    const posRates = posList.map(p => {
      const item = posMap[p];
      return item.total > 0 ? Number(((item.hadir / item.total) * 100).toFixed(1)) : 0;
    });

    const colors = this.getChartColors();
    this.charts.positionComp = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: posList.map(p => p.length > 15 ? p.slice(0, 14) + '…' : p),
        datasets: [{
          label: 'Rata-rata Kehadiran (%)',
          data: posRates,
          backgroundColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.textColor, font: { size: 10 } } },
          y: { max: 100, grid: { color: colors.gridColor }, ticks: { color: colors.textColor } }
        }
      }
    });
  },

  // 5. Perbandingan Kehadiran Berdasarkan Unit Kerja / Lokasi
  renderDepartmentComparisonChart(records) {
    const ctx = document.getElementById('chartDepartmentComparison');
    if (!ctx) return;
    if (this.charts.deptComp) this.charts.deptComp.destroy();

    const deptMap = {};
    for (const r of records) {
      const dept = r.unit_kerja || 'Umum';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, hadir: 0, late: 0 };
      const st = AttendanceRules.mapStatus(r.status);
      if (st !== AttendanceRules.STATUS_KEYS.HARI_LIBUR) {
        deptMap[dept].total++;
        if (st === AttendanceRules.STATUS_KEYS.HADIR || (AppState.settings.dinasLuarAsHadir && st === AttendanceRules.STATUS_KEYS.DINAS_LUAR)) {
          deptMap[dept].hadir++;
        }
      }
      if (AttendanceRules.isLate(AttendanceRules.mapEntryStatus(r.presensi_masuk_status), AppState.settings)) {
        deptMap[dept].late++;
      }
    }

    const deptList = Object.keys(deptMap);
    const hadirRates = deptList.map(d => {
      const itm = deptMap[d];
      return itm.total > 0 ? Number(((itm.hadir / itm.total) * 100).toFixed(1)) : 0;
    });
    const lateCounts = deptList.map(d => deptMap[d].late);

    const colors = this.getChartColors();
    this.charts.deptComp = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: deptList,
        datasets: [
          {
            label: 'Tingkat Kehadiran (%)',
            data: hadirRates,
            backgroundColor: '#06b6d4',
            borderRadius: 6
          },
          {
            label: 'Kejadian Terlambat',
            data: lateCounts,
            backgroundColor: '#f59e0b',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: colors.textColor, font: { size: 11 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.textColor, font: { size: 10 } } },
          y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor }, beginAtZero: true }
        }
      }
    });
  },

  // 6. Tren Keterlambatan dan Pulang Awal (Line)
  renderPunctualityTrendChart(records) {
    const ctx = document.getElementById('chartPunctualityTrend');
    if (!ctx) return;
    if (this.charts.punctualityTrend) this.charts.punctualityTrend.destroy();

    const dateMap = {};
    for (const r of records) {
      if (!dateMap[r.tanggal]) dateMap[r.tanggal] = { late: 0, early: 0 };
      const entry = AttendanceRules.mapEntryStatus(r.presensi_masuk_status);
      const exit = AttendanceRules.mapExitStatus(r.presensi_keluar_status);

      if (AttendanceRules.isLate(entry, AppState.settings)) {
        dateMap[r.tanggal].late++;
      }
      if (AttendanceRules.isEarlyLeave(exit)) {
        dateMap[r.tanggal].early++;
      }
    }

    const sortedDates = Object.keys(dateMap).sort();
    const lateData = sortedDates.map(d => dateMap[d].late);
    const earlyData = sortedDates.map(d => dateMap[d].early);
    const labels = sortedDates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    const colors = this.getChartColors();
    this.charts.punctualityTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Terlambat',
            data: lateData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: labels.length > 20 ? 1 : 2.5
          },
          {
            label: 'Pulang Awal',
            data: earlyData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: labels.length > 20 ? 1 : 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: colors.textColor, font: { size: 11 } } }
        },
        scales: {
          x: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor } },
          y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor }, beginAtZero: true }
        }
      }
    });
  }
};
