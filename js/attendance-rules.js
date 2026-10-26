/**
 * PresensiPro - Attendance Rules & Computation Engine
 * Formulates categorized statuses, punctuality metrics, working days, and attendance rates.
 */

const AttendanceRules = {
  // Standard recognized status keys
  STATUS_KEYS: {
    HADIR: 'Hadir',
    TIDAK_HADIR: 'Tidak Hadir',
    HARI_LIBUR: 'Hari Libur',
    IZIN: 'Izin',
    SAKIT: 'Sakit',
    DINAS_LUAR: 'Dinas Luar',
    PERLU_DITINJAU: 'Perlu Ditinjau'
  },

  ENTRY_STATUS_KEYS: {
    TEPAT_WAKTU: 'Tepat Waktu',
    TERLAMBAT: 'Terlambat',
    MELEBIHI_TOLERANSI: 'Melebihi Toleransi',
    TIDAK_HADIR: 'Tidak Hadir'
  },

  EXIT_STATUS_KEYS: {
    TEPAT_WAKTU: 'Tepat Waktu',
    PULANG_AWAL: 'Pulang Awal',
    TIDAK_HADIR: 'Tidak Hadir'
  },

  /**
   * Map raw status from CSV into standardized category
   * Does NOT look at Presensi Masuk / Keluar Status or force Dinas Luar
   */
  mapStatus(rawStatus) {
    if (!rawStatus) return this.STATUS_KEYS.PERLU_DITINJAU;
    const clean = rawStatus.trim().toLowerCase();

    if (clean === 'hadir' || clean === 'present' || clean === 'masuk') {
      return this.STATUS_KEYS.HADIR;
    }
    if (clean === 'tidak hadir' || clean === 'absent' || clean === 'alpha' || clean === 'alpa') {
      return this.STATUS_KEYS.TIDAK_HADIR;
    }
    if (clean === 'hari libur' || clean === 'libur' || clean === 'off' || clean === 'holiday') {
      return this.STATUS_KEYS.HARI_LIBUR;
    }
    if (clean === 'izin' || clean === 'ijin' || clean === 'cuti' || clean === 'leave') {
      return this.STATUS_KEYS.IZIN;
    }
    if (clean === 'sakit' || clean === 'sick') {
      return this.STATUS_KEYS.SAKIT;
    }
    if (clean === 'dinas luar' || clean === 'dinas' || clean === 'tugas luar' || clean === 'perjalanan dinas') {
      return this.STATUS_KEYS.DINAS_LUAR;
    }

    return this.STATUS_KEYS.PERLU_DITINJAU;
  },

  /**
   * Map entry punctuality status
   */
  mapEntryStatus(rawEntryStatus) {
    if (!rawEntryStatus) return this.ENTRY_STATUS_KEYS.TEPAT_WAKTU;
    const clean = rawEntryStatus.trim().toLowerCase();

    if (clean.includes('tepat') || clean === 'on time' || clean === 'ontime') {
      return this.ENTRY_STATUS_KEYS.TEPAT_WAKTU;
    }
    if (clean.includes('toleransi') || clean === 'over tolerance' || clean === 'melebihi toleransi') {
      return this.ENTRY_STATUS_KEYS.MELEBIHI_TOLERANSI;
    }
    if (clean.includes('terlambat') || clean.includes('telat') || clean === 'late') {
      return this.ENTRY_STATUS_KEYS.TERLAMBAT;
    }
    if (clean.includes('tidak') || clean === 'absent') {
      return this.ENTRY_STATUS_KEYS.TIDAK_HADIR;
    }

    return rawEntryStatus.trim();
  },

  /**
   * Map exit punctuality status
   */
  mapExitStatus(rawExitStatus) {
    if (!rawExitStatus) return this.EXIT_STATUS_KEYS.TEPAT_WAKTU;
    const clean = rawExitStatus.trim().toLowerCase();

    if (clean.includes('tepat') || clean === 'on time') {
      return this.EXIT_STATUS_KEYS.TEPAT_WAKTU;
    }
    if (clean.includes('pulang awal') || clean.includes('cepat pulang') || clean === 'early leave') {
      return this.EXIT_STATUS_KEYS.PULANG_AWAL;
    }
    if (clean.includes('tidak') || clean === 'absent') {
      return this.EXIT_STATUS_KEYS.TIDAK_HADIR;
    }

    return rawExitStatus.trim();
  },

  /**
   * Check if an entry status is considered Late according to settings
   */
  isLate(entryStatus, settings = {}) {
    if (entryStatus === this.ENTRY_STATUS_KEYS.TERLAMBAT) return true;
    if (settings.combineToleranceWithLate && entryStatus === this.ENTRY_STATUS_KEYS.MELEBIHI_TOLERANSI) {
      return true;
    }
    return false;
  },

  /**
   * Check if an exit status is considered Early Departure
   */
  isEarlyLeave(exitStatus) {
    return exitStatus === this.EXIT_STATUS_KEYS.PULANG_AWAL;
  },

  /**
   * Calculate summary metrics from a list of filtered records
   */
  computeMetrics(records, settings = {}) {
    const config = {
      dinasLuarAsHadir: settings.dinasLuarAsHadir || false,
      combineToleranceWithLate: settings.combineToleranceWithLate || false,
      ...settings
    };

    let totalRecords = records.length;
    const uniqueEmployees = new Set();
    const uniqueDates = new Set();
    const validWorkDates = new Set();

    let countHadir = 0;
    let countTidakHadir = 0;
    let countIzin = 0;
    let countSakit = 0;
    let countDinasLuar = 0;
    let countHariLibur = 0;
    let countPerluDitinjau = 0;

    let lateOccurrences = 0;
    let toleranceOccurrences = 0;
    let earlyLeaveOccurrences = 0;

    const employeesWithLate = new Set();
    const employeesWithTolerance = new Set();
    const employeesWithEarlyLeave = new Set();

    // Grouping by employee for individual statistics
    const employeeMap = {};

    for (const rec of records) {
      const empId = rec.id_karyawan || rec.karyawan;
      uniqueEmployees.add(empId);
      uniqueDates.add(rec.tanggal);

      const mappedStatus = this.mapStatus(rec.status);
      const mappedEntry = this.mapEntryStatus(rec.presensi_masuk_status);
      const mappedExit = this.mapExitStatus(rec.presensi_keluar_status);

      // Distinct valid work dates (excluding Hari Libur)
      if (mappedStatus !== this.STATUS_KEYS.HARI_LIBUR) {
        validWorkDates.add(rec.tanggal);
      }

      // Initialize employee container
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          id: empId,
          nama: rec.karyawan,
          jabatan: rec.jabatan,
          unit_kerja: rec.unit_kerja,
          lokasi: rec.lokasi,
          totalRecords: 0,
          hadir: 0,
          tidakHadir: 0,
          izin: 0,
          sakit: 0,
          dinasLuar: 0,
          hariLibur: 0,
          perluDitinjau: 0,
          lateOccurrences: 0,
          toleranceOccurrences: 0,
          earlyLeaveOccurrences: 0,
          workDates: new Set(),
          records: []
        };
      }

      const emp = employeeMap[empId];
      emp.totalRecords++;
      emp.records.push(rec);

      if (mappedStatus !== this.STATUS_KEYS.HARI_LIBUR) {
        emp.workDates.add(rec.tanggal);
      }

      switch (mappedStatus) {
        case this.STATUS_KEYS.HADIR:
          countHadir++;
          emp.hadir++;
          break;
        case this.STATUS_KEYS.TIDAK_HADIR:
          countTidakHadir++;
          emp.tidakHadir++;
          break;
        case this.STATUS_KEYS.IZIN:
          countIzin++;
          emp.izin++;
          break;
        case this.STATUS_KEYS.SAKIT:
          countSakit++;
          emp.sakit++;
          break;
        case this.STATUS_KEYS.DINAS_LUAR:
          countDinasLuar++;
          emp.dinasLuar++;
          break;
        case this.STATUS_KEYS.HARI_LIBUR:
          countHariLibur++;
          emp.hariLibur++;
          break;
        default:
          countPerluDitinjau++;
          emp.perluDitinjau++;
          break;
      }

      // Check Lateness & Punctuality
      if (this.isLate(mappedEntry, config)) {
        lateOccurrences++;
        employeesWithLate.add(empId);
        emp.lateOccurrences++;
      }

      if (mappedEntry === this.ENTRY_STATUS_KEYS.MELEBIHI_TOLERANSI) {
        toleranceOccurrences++;
        employeesWithTolerance.add(empId);
        emp.toleranceOccurrences++;
      }

      // Check Early Leave
      if (this.isEarlyLeave(mappedExit)) {
        earlyLeaveOccurrences++;
        employeesWithEarlyLeave.add(empId);
        emp.earlyLeaveOccurrences++;
      }
    }

    // Applicable Working Days:
    // Estimated based on distinct valid working days in the filtered data
    const applicableWorkDays = validWorkDates.size;

    // Effective Hadir based on Dinas Luar policy
    const effectiveHadir = countHadir + (config.dinasLuarAsHadir ? countDinasLuar : 0);

    // Attendance percentage overall
    // Total potential work-person-days = applicableWorkDays * uniqueEmployees.size
    const totalPotentialWorkDays = applicableWorkDays * (uniqueEmployees.size || 1);
    const overallAttendanceRate = totalPotentialWorkDays > 0 
      ? Math.min(100, (effectiveHadir / totalPotentialWorkDays) * 100) 
      : null;

    // Process individual employee recap metrics
    const employeeList = Object.values(employeeMap).map(emp => {
      const empWorkDays = emp.workDates.size || applicableWorkDays;
      const empEffectiveHadir = emp.hadir + (config.dinasLuarAsHadir ? emp.dinasLuar : 0);
      const attendanceRate = empWorkDays > 0 
        ? Math.min(100, (empEffectiveHadir / empWorkDays) * 100) 
        : null;

      return {
        ...emp,
        applicableWorkDays: empWorkDays,
        effectiveHadir: empEffectiveHadir,
        attendanceRate: attendanceRate !== null ? Number(attendanceRate.toFixed(1)) : null,
        attendanceRateFormatted: attendanceRate !== null ? `${attendanceRate.toFixed(1)}%` : '—'
      };
    });

    return {
      totalRecords,
      uniqueEmployeesCount: uniqueEmployees.size,
      applicableWorkDays,
      workDaysIsEstimated: true,
      countHadir,
      countTidakHadir,
      countIzin,
      countSakit,
      countDinasLuar,
      countHariLibur,
      countPerluDitinjau,
      effectiveHadir,
      overallAttendanceRate: overallAttendanceRate !== null ? Number(overallAttendanceRate.toFixed(1)) : null,
      overallAttendanceRateFormatted: overallAttendanceRate !== null ? `${overallAttendanceRate.toFixed(1)}%` : '—',

      // Punctuality & Time Analysis
      lateOccurrences,
      toleranceOccurrences,
      uniqueLateEmployeesCount: employeesWithLate.size,
      uniqueToleranceEmployeesCount: employeesWithTolerance.size,
      earlyLeaveOccurrences,
      uniqueEarlyLeaveEmployeesCount: employeesWithEarlyLeave.size,

      // Percentage Distributions
      hadirPct: totalRecords > 0 ? Number(((countHadir / totalRecords) * 100).toFixed(1)) : 0,
      tidakHadirPct: totalRecords > 0 ? Number(((countTidakHadir / totalRecords) * 100).toFixed(1)) : 0,
      izinPct: totalRecords > 0 ? Number(((countIzin / totalRecords) * 100).toFixed(1)) : 0,
      sakitPct: totalRecords > 0 ? Number(((countSakit / totalRecords) * 100).toFixed(1)) : 0,
      dinasLuarPct: totalRecords > 0 ? Number(((countDinasLuar / totalRecords) * 100).toFixed(1)) : 0,
      hariLiburPct: totalRecords > 0 ? Number(((countHariLibur / totalRecords) * 100).toFixed(1)) : 0,
      perluDitinjauPct: totalRecords > 0 ? Number(((countPerluDitinjau / totalRecords) * 100).toFixed(1)) : 0,

      employees: employeeList
    };
  }
};
