/**
 * PresensiPro - Rekap Individual Karyawan & Detail View
 * Manages the employee summary table, sorting, pagination, and employee attendance logs modal.
 */

const UIEmployees = {
  currentPage: 1,
  pageSize: 15,
  currentSortCol: 'nama',
  currentSortDir: 'asc',
  selectedEmployee: null,

  init() {
    this.bindEvents();

    AppState.subscribe('DATA_UPDATED', ({ metrics }) => {
      this.renderTable(metrics);
    });
  },

  bindEvents() {
    // Search input inside employee tab
    const searchInput = document.getElementById('employeeTabSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.currentPage = 1;
        this.renderTable(AppState.computedMetrics);
      });
    }

    // Pagination buttons
    document.getElementById('btnEmpPrev')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderTable(AppState.computedMetrics);
      }
    });

    document.getElementById('btnEmpNext')?.addEventListener('click', () => {
      const metrics = AppState.computedMetrics;
      if (!metrics) return;
      const totalPages = Math.ceil(metrics.employees.length / this.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderTable(metrics);
      }
    });

    // Close detail modal
    document.getElementById('btnCloseEmployeeDetail')?.addEventListener('click', () => {
      this.closeDetailModal();
    });

    // Export individual employee CSV button inside modal
    document.getElementById('btnExportIndividualCSV')?.addEventListener('click', () => {
      if (this.selectedEmployee) {
        UIExport.exportIndividualEmployee(this.selectedEmployee);
      }
    });
  },

  setSort(col) {
    if (this.currentSortCol === col) {
      this.currentSortDir = this.currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortCol = col;
      this.currentSortDir = 'asc';
    }
    this.renderTable(AppState.computedMetrics);
  },

  renderTable(metrics) {
    const tbody = document.getElementById('employeeRecapTableBody');
    if (!tbody || !metrics) return;

    let employees = [...metrics.employees];

    // Filter by tab-specific search if any
    const searchVal = document.getElementById('employeeTabSearch')?.value.toLowerCase().trim();
    if (searchVal) {
      employees = employees.filter(e => 
        e.nama.toLowerCase().includes(searchVal) ||
        (e.jabatan && e.jabatan.toLowerCase().includes(searchVal)) ||
        (e.unit_kerja && e.unit_kerja.toLowerCase().includes(searchVal))
      );
    }

    // Sort
    employees.sort((a, b) => {
      let valA = a[this.currentSortCol];
      let valB = b[this.currentSortCol];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === null || valA === undefined) valA = -1;
      if (valB === null || valB === undefined) valB = -1;

      if (valA < valB) return this.currentSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.currentSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const totalItems = employees.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const paginated = employees.slice(startIdx, startIdx + this.pageSize);

    // Update pagination labels
    const infoEl = document.getElementById('empPaginationInfo');
    if (infoEl) {
      infoEl.textContent = `Menampilkan ${totalItems === 0 ? 0 : startIdx + 1}–${Math.min(startIdx + this.pageSize, totalItems)} dari ${totalItems} karyawan`;
    }

    const btnPrev = document.getElementById('btnEmpPrev');
    const btnNext = document.getElementById('btnEmpNext');
    if (btnPrev) btnPrev.disabled = this.currentPage <= 1;
    if (btnNext) btnNext.disabled = this.currentPage >= totalPages;

    tbody.innerHTML = '';

    if (paginated.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            Tidak ada data karyawan yang cocok dengan filter aktif.
          </td>
        </tr>
      `;
      return;
    }

    for (const emp of paginated) {
      const tr = document.createElement('tr');
      const rate = emp.attendanceRate !== null ? emp.attendanceRate : null;
      let progressColor = '#10b981';
      if (rate !== null && rate < 75) progressColor = '#ef4444';
      else if (rate !== null && rate < 85) progressColor = '#f59e0b';

      tr.innerHTML = `
        <td>
          <a href="javascript:void(0)" onclick="UIEmployees.showDetail('${escapeHtml(emp.id)}')" style="font-weight: 700; color: var(--primary);">
            ${escapeHtml(emp.nama)}
          </a>
        </td>
        <td><small>${escapeHtml(emp.jabatan)}</small></td>
        <td><small>${escapeHtml(emp.unit_kerja)}</small></td>
        <td style="text-align: center;"><span class="badge badge-hadir">${emp.hadir}</span></td>
        <td style="text-align: center;"><span class="badge ${emp.tidakHadir > 0 ? 'badge-tidak-hadir' : ''}">${emp.tidakHadir}</span></td>
        <td style="text-align: center;">${emp.izin}</td>
        <td style="text-align: center;">${emp.sakit}</td>
        <td style="text-align: center;">${emp.dinasLuar}</td>
        <td style="text-align: center;">${emp.hariLibur}</td>
        <td style="text-align: center;"><span class="${emp.lateOccurrences > 0 ? 'badge badge-terlambat' : ''}">${emp.lateOccurrences}</span></td>
        <td style="text-align: center;"><span class="${emp.earlyLeaveOccurrences > 0 ? 'badge badge-pulang-awal' : ''}">${emp.earlyLeaveOccurrences}</span></td>
        <td>
          <div class="attendance-progress-wrapper">
            <span style="font-weight: 700; font-family: var(--font-mono); font-size: 0.8rem; min-width: 45px;">
              ${emp.attendanceRateFormatted}
            </span>
            <div class="attendance-progress-bar">
              <div class="attendance-progress-fill" style="width: ${rate !== null ? rate : 0}%; background-color: ${progressColor};"></div>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }
  },

  showDetail(empId) {
    const metrics = AppState.computedMetrics;
    if (!metrics) return;

    const emp = metrics.employees.find(e => e.id === empId || e.nama === empId);
    if (!emp) return;

    this.selectedEmployee = emp;
    const modal = document.getElementById('employeeDetailModal');
    if (!modal) return;

    document.getElementById('modalEmpName').textContent = emp.nama;
    document.getElementById('modalEmpMeta').textContent = `${emp.jabatan} • ${emp.unit_kerja} • ${emp.lokasi}`;
    document.getElementById('modalEmpRate').textContent = emp.attendanceRateFormatted;
    document.getElementById('modalEmpHadir').textContent = `${emp.hadir} hari`;
    document.getElementById('modalEmpLate').textContent = `${emp.lateOccurrences} kali`;
    document.getElementById('modalEmpEarly').textContent = `${emp.earlyLeaveOccurrences} kali`;

    const tbody = document.getElementById('modalEmpLogBody');
    tbody.innerHTML = '';

    // Sort records descending by date
    const sortedRecords = [...emp.records].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    for (const rec of sortedRecords) {
      const tr = document.createElement('tr');
      const mappedStatus = AttendanceRules.mapStatus(rec.status);
      const mappedEntry = AttendanceRules.mapEntryStatus(rec.presensi_masuk_status);
      const mappedExit = AttendanceRules.mapExitStatus(rec.presensi_keluar_status);

      let statusBadge = 'badge-hadir';
      if (mappedStatus === AttendanceRules.STATUS_KEYS.TIDAK_HADIR) statusBadge = 'badge-tidak-hadir';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.HARI_LIBUR) statusBadge = 'badge-hari-libur';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.IZIN) statusBadge = 'badge-izin';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.SAKIT) statusBadge = 'badge-sakit';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.DINAS_LUAR) statusBadge = 'badge-dinas-luar';
      else if (mappedStatus === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU) statusBadge = 'badge-review';

      tr.innerHTML = `
        <td><strong>${rec.tanggal}</strong></td>
        <td>${rec.waktu_masuk || '<span class="text-dim">-</span>'}</td>
        <td>${rec.waktu_keluar || '<span class="text-dim">-</span>'}</td>
        <td><span class="badge ${statusBadge}">${mappedStatus}</span></td>
        <td><small class="${mappedEntry === 'Terlambat' ? 'badge badge-terlambat' : ''}">${mappedEntry}</small></td>
        <td><small class="${mappedExit === 'Pulang Awal' ? 'badge badge-pulang-awal' : ''}">${mappedExit}</small></td>
        <td><small>${escapeHtml(rec.lokasi)}</small></td>
        <td><small class="${rec.dinas_luar === 'Ya' ? 'badge badge-dinas-luar' : ''}">${escapeHtml(rec.dinas_luar)}</small></td>
      `;
      tbody.appendChild(tr);
    }

    modal.classList.add('active');
  },

  closeDetailModal() {
    const modal = document.getElementById('employeeDetailModal');
    if (modal) modal.classList.remove('active');
    this.selectedEmployee = null;
  }
};
