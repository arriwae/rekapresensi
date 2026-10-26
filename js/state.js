/**
 * PresensiPro - Centralized Reactive State Management
 * Holds records, active filters, computed statistics, and dispatches events to UI subscribers.
 */

const AppState = {
  allRecords: [],
  filteredRecords: [],
  computedMetrics: null,
  batches: [],
  settings: {
    dinasLuarAsHadir: false,
    combineToleranceWithLate: false,
    theme: 'dark'
  },

  filters: {
    startDate: '',
    endDate: '',
    yearMonth: 'all',
    karyawan: 'all',
    jabatan: 'all',
    unit_kerja: 'all',
    lokasi: 'all',
    status: 'all',
    presensi_masuk_status: 'all',
    presensi_keluar_status: 'all',
    searchQuery: ''
  },

  listeners: {},

  /**
   * Subscribe to state change events
   */
  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  },

  /**
   * Publish state change notification
   */
  notify(event, data) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in subscriber for ${event}:`, err);
        }
      }
    }
  },

  /**
   * Set application settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    for (const [key, val] of Object.entries(newSettings)) {
      await AppDB.saveSetting(key, val);
    }
    this.applyFilters();
    this.notify('SETTINGS_CHANGED', this.settings);
  },

  /**
   * Load data from IndexedDB into state
   */
  async loadFromDB() {
    this.allRecords = await AppDB.getAllRecords();
    this.batches = await AppDB.getBatches();
    const dbSettings = await AppDB.getSettings();
    if (dbSettings) {
      this.settings = { ...this.settings, ...dbSettings };
    }
    this.applyFilters();
    this.notify('RECORDS_LOADED', {
      total: this.allRecords.length,
      batches: this.batches.length
    });
  },

  /**
   * Set a filter property and recompute
   */
  setFilter(key, value) {
    this.filters[key] = value;
    this.applyFilters();
  },

  /**
   * Reset all filters to default
   */
  resetFilters() {
    this.filters = {
      startDate: '',
      endDate: '',
      yearMonth: 'all',
      karyawan: 'all',
      jabatan: 'all',
      unit_kerja: 'all',
      lokasi: 'all',
      status: 'all',
      presensi_masuk_status: 'all',
      presensi_keluar_status: 'all',
      searchQuery: ''
    };
    this.applyFilters();
  },

  /**
   * Apply all active filters to allRecords
   */
  applyFilters() {
    const f = this.filters;
    let list = this.allRecords;

    if (f.yearMonth && f.yearMonth !== 'all') {
      list = list.filter(r => r.tanggal.startsWith(f.yearMonth));
    }

    if (f.startDate) {
      list = list.filter(r => r.tanggal >= f.startDate);
    }

    if (f.endDate) {
      list = list.filter(r => r.tanggal <= f.endDate);
    }

    if (f.karyawan && f.karyawan !== 'all') {
      list = list.filter(r => r.karyawan === f.karyawan || r.id_karyawan === f.karyawan);
    }

    if (f.jabatan && f.jabatan !== 'all') {
      list = list.filter(r => r.jabatan === f.jabatan);
    }

    if (f.unit_kerja && f.unit_kerja !== 'all') {
      list = list.filter(r => r.unit_kerja === f.unit_kerja);
    }

    if (f.lokasi && f.lokasi !== 'all') {
      list = list.filter(r => r.lokasi === f.lokasi);
    }

    if (f.status && f.status !== 'all') {
      list = list.filter(r => AttendanceRules.mapStatus(r.status) === f.status);
    }

    if (f.presensi_masuk_status && f.presensi_masuk_status !== 'all') {
      list = list.filter(r => AttendanceRules.mapEntryStatus(r.presensi_masuk_status) === f.presensi_masuk_status);
    }

    if (f.presensi_keluar_status && f.presensi_keluar_status !== 'all') {
      list = list.filter(r => AttendanceRules.mapExitStatus(r.presensi_keluar_status) === f.presensi_keluar_status);
    }

    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        return (r.karyawan && r.karyawan.toLowerCase().includes(q)) ||
               (r.jabatan && r.jabatan.toLowerCase().includes(q)) ||
               (r.unit_kerja && r.unit_kerja.toLowerCase().includes(q)) ||
               (r.lokasi && r.lokasi.toLowerCase().includes(q));
      });
    }

    this.filteredRecords = list;
    this.computedMetrics = AttendanceRules.computeMetrics(this.filteredRecords, this.settings);
    this.notify('DATA_UPDATED', {
      filteredRecords: this.filteredRecords,
      metrics: this.computedMetrics,
      filters: this.filters
    });
  },

  /**
   * Helper to get list of distinct values for filter dropdowns
   */
  getDistinctFilterOptions() {
    const months = new Set();
    const employees = new Set();
    const positions = new Set();
    const departments = new Set();
    const locations = new Set();

    for (const r of this.allRecords) {
      if (r.tanggal) {
        months.add(r.tanggal.slice(0, 7)); // YYYY-MM
      }
      if (r.karyawan) employees.add(r.karyawan);
      if (r.jabatan) positions.add(r.jabatan);
      if (r.unit_kerja) departments.add(r.unit_kerja);
      if (r.lokasi) locations.add(r.lokasi);
    }

    return {
      months: Array.from(months).sort().reverse(),
      employees: Array.from(employees).sort(),
      positions: Array.from(positions).sort(),
      departments: Array.from(departments).sort(),
      locations: Array.from(locations).sort()
    };
  }
};
