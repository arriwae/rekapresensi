/**
 * PresensiPro - Month-to-Month Comparison Module
 * Allows side-by-side analytical comparison between two selected periods/months.
 */

const UIComparison = {
  comparisonChart: null,

  init() {
    this.bindEvents();

    AppState.subscribe('RECORDS_LOADED', () => {
      this.populateMonthSelectors();
    });
  },

  bindEvents() {
    document.getElementById('compMonthA')?.addEventListener('change', () => this.runComparison());
    document.getElementById('compMonthB')?.addEventListener('change', () => this.runComparison());
  },

  populateMonthSelectors() {
    const opts = AppState.getDistinctFilterOptions();
    const selA = document.getElementById('compMonthA');
    const selB = document.getElementById('compMonthB');
    if (!selA || !selB) return;

    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const fill = (sel, selectedIndex = 0) => {
      sel.innerHTML = '';
      if (opts.months.length === 0) {
        sel.innerHTML = '<option value="">Belum ada data bulan</option>';
        return;
      }
      opts.months.forEach((ym, idx) => {
        const [y, m] = ym.split('-');
        const opt = document.createElement('option');
        opt.value = ym;
        opt.textContent = `${monthNames[parseInt(m)]} ${y}`;
        if (idx === selectedIndex) opt.selected = true;
        sel.appendChild(opt);
      });
    };

    fill(selA, 1 < opts.months.length ? 1 : 0);
    fill(selB, 0);

    this.runComparison();
  },

  runComparison() {
    const selA = document.getElementById('compMonthA');
    const selB = document.getElementById('compMonthB');
    if (!selA || !selB || !selA.value || !selB.value) return;

    const ymA = selA.value;
    const ymB = selB.value;

    const recordsA = AppState.allRecords.filter(r => r.tanggal.startsWith(ymA));
    const recordsB = AppState.allRecords.filter(r => r.tanggal.startsWith(ymB));

    const metricsA = AttendanceRules.computeMetrics(recordsA, AppState.settings);
    const metricsB = AttendanceRules.computeMetrics(recordsB, AppState.settings);

    this.renderComparisonCards(metricsA, metricsB, ymA, ymB);
    this.renderComparisonChart(metricsA, metricsB, ymA, ymB);
  },

  renderComparisonCards(mA, mB, labelA, labelB) {
    const container = document.getElementById('comparisonCardsContainer');
    if (!container) return;

    const formatDelta = (valA, valB, isInverseGood = false) => {
      const diff = valB - valA;
      const formattedDiff = (diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`);
      let badgeClass = 'badge-hadir';

      if (isInverseGood) {
        // Lower is better (e.g. late occurrences, absent)
        badgeClass = diff < 0 ? 'badge-hadir' : (diff > 0 ? 'badge-tidak-hadir' : 'badge-hari-libur');
      } else {
        // Higher is better (e.g. attendance rate)
        badgeClass = diff > 0 ? 'badge-hadir' : (diff < 0 ? 'badge-tidak-hadir' : 'badge-hari-libur');
      }

      return `<span class="badge ${badgeClass}" style="margin-top: 4px;">${formattedDiff}</span>`;
    };

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-title">Tingkat Kehadiran</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 0.5rem 0;">
          <div><small class="text-dim">${labelA}:</small> <strong>${mA.overallAttendanceRateFormatted}</strong></div>
          <div style="text-align: right;"><small class="text-dim">${labelB}:</small> <strong style="font-size: 1.2rem; color: var(--primary);">${mB.overallAttendanceRateFormatted}</strong></div>
        </div>
        ${formatDelta(mA.overallAttendanceRate || 0, mB.overallAttendanceRate || 0)}
      </div>

      <div class="stat-card">
        <div class="stat-title">Kejadian Terlambat</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 0.5rem 0;">
          <div><small class="text-dim">${labelA}:</small> <strong>${mA.lateOccurrences}</strong></div>
          <div style="text-align: right;"><small class="text-dim">${labelB}:</small> <strong style="font-size: 1.2rem; color: var(--warning);">${mB.lateOccurrences}</strong></div>
        </div>
        ${formatDelta(mA.lateOccurrences, mB.lateOccurrences, true)}
      </div>

      <div class="stat-card">
        <div class="stat-title">Karyawan Pernah Terlambat</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 0.5rem 0;">
          <div><small class="text-dim">${labelA}:</small> <strong>${mA.uniqueLateEmployeesCount}</strong></div>
          <div style="text-align: right;"><small class="text-dim">${labelB}:</small> <strong>${mB.uniqueLateEmployeesCount}</strong></div>
        </div>
        ${formatDelta(mA.uniqueLateEmployeesCount, mB.uniqueLateEmployeesCount, true)}
      </div>

      <div class="stat-card">
        <div class="stat-title">Kejadian Pulang Awal</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 0.5rem 0;">
          <div><small class="text-dim">${labelA}:</small> <strong>${mA.earlyLeaveOccurrences}</strong></div>
          <div style="text-align: right;"><small class="text-dim">${labelB}:</small> <strong style="font-size: 1.2rem; color: var(--purple);">${mB.earlyLeaveOccurrences}</strong></div>
        </div>
        ${formatDelta(mA.earlyLeaveOccurrences, mB.earlyLeaveOccurrences, true)}
      </div>

      <div class="stat-card">
        <div class="stat-title">Ketidakhadiran (Alpha)</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 0.5rem 0;">
          <div><small class="text-dim">${labelA}:</small> <strong>${mA.countTidakHadir}</strong></div>
          <div style="text-align: right;"><small class="text-dim">${labelB}:</small> <strong style="font-size: 1.2rem; color: var(--danger);">${mB.countTidakHadir}</strong></div>
        </div>
        ${formatDelta(mA.countTidakHadir, mB.countTidakHadir, true)}
      </div>
    `;
  },

  renderComparisonChart(mA, mB, labelA, labelB) {
    const ctx = document.getElementById('chartComparisonBar');
    if (!ctx) return;
    if (this.comparisonChart) this.comparisonChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    this.comparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Terlambat', 'Pulang Awal'],
        datasets: [
          {
            label: `Bulan ${labelA}`,
            data: [
              mA.countHadir, mA.countTidakHadir, mA.countIzin, mA.countSakit, mA.countDinasLuar,
              mA.lateOccurrences, mA.earlyLeaveOccurrences
            ],
            backgroundColor: 'rgba(99, 102, 241, 0.65)',
            borderRadius: 6
          },
          {
            label: `Bulan ${labelB}`,
            data: [
              mB.countHadir, mB.countTidakHadir, mB.countIzin, mB.countSakit, mB.countDinasLuar,
              mB.lateOccurrences, mB.earlyLeaveOccurrences
            ],
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: textColor, font: { size: 12 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
        }
      }
    });
  }
};
