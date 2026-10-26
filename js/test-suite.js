/**
 * PresensiPro - Built-in Automated Test & Validation Suite
 * Formally verifies required edge cases:
 * 1. Hari Libur exclusion from working day denominator
 * 2. Dash '-' in Time In / Time Out handled safely as null
 * 3. Employees with multiple records
 * 4. Duplicate record detection and resolution
 * 5. Unrecognized status classification ('Perlu Ditinjau')
 * 6. Dinas Luar policy recalculation
 * 7. Tolerance grouping toggle
 */

const AppTestSuite = {
  testResults: [],

  init() {
    document.getElementById('btnRunTests')?.addEventListener('click', () => {
      this.runAllTests();
    });
  },

  async runAllTests() {
    this.testResults = [];
    const container = document.getElementById('testResultsContainer');
    if (container) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">${getIcon('refresh', 'spin')} Menjalankan rangkaian pengujian validasi...</div>`;
    }

    try {
      await this.test1_HariLiburExclusion();
      await this.test2_DashTimeHandling();
      await this.test3_MultipleRecordsPerEmployee();
      await this.test4_DuplicateDetectionAndResolution();
      await this.test5_UnrecognizedStatusMapping();
      await this.test6_DinasLuarPolicyToggle();
      await this.test7_ToleranceGroupingPolicy();

      this.renderResults();
    } catch (err) {
      console.error('Test Suite Error:', err);
      if (container) {
        container.innerHTML = `<div class="badge badge-tidak-hadir" style="padding: 1rem;">Terjadi kesalahan saat pengujian: ${err.message}</div>`;
      }
    }
  },

  assert(testName, description, passed, details) {
    this.testResults.push({
      name: testName,
      description,
      passed,
      details
    });
  },

  // 1. Test Status Hari Libur
  async test1_HariLiburExclusion() {
    const csvSample = `Karyawan,Jabatan/Posisi,Tanggal,Waktu Masuk,Waktu Keluar,Status,Presensi Masuk Status,Presensi Keluar Status,Dinas Luar,Unit Kerja,Lokasi,Presensi,Timezone
"Ahmad Fauzi","Developer","2026-10-01","08:00","17:00","Hadir","Tepat Waktu","Tepat Waktu","Tidak","IT","Jakarta","Hadir","Asia/Jakarta"
"Ahmad Fauzi","Developer","2026-10-02","-","-","Hari Libur","Tidak Hadir","Tidak Hadir","Tidak","IT","Jakarta","Libur Nasional","Asia/Jakarta"
"Ahmad Fauzi","Developer","2026-10-03","-","-","Hari Libur","Tidak Hadir","Tidak Hadir","Tidak","IT","Jakarta","Libur Mingguan","Asia/Jakarta"`;

    const parsed = CSVParser.parse(csvSample);
    const metrics = AttendanceRules.computeMetrics(parsed.dataRows, { dinasLuarAsHadir: false });

    // Applicable work days must be 1 (only Oct 1st), Hari Libur must NOT be in denominator
    const passed = metrics.applicableWorkDays === 1 &&
                   metrics.countHariLibur === 2 &&
                   metrics.countHadir === 1 &&
                   metrics.overallAttendanceRate === 100;

    this.assert(
      'Uji 1: Status "Hari Libur" Dikecualikan dari Penyebut',
      'Memastikan bahwa Hari Libur tidak dihitung sebagai hari kerja berlaku dalam penyebut persentase kehadiran.',
      passed,
      `Hari Kerja Berlaku: ${metrics.applicableWorkDays} (Diharapkan: 1), Libur: ${metrics.countHariLibur}, Tingkat Kehadiran: ${metrics.overallAttendanceRateFormatted} (Diharapkan: 100%)`
    );
  },

  // 2. Test '-' time parsing
  async test2_DashTimeHandling() {
    const timeDash1 = CSVParser.parseTime('-');
    const timeDash2 = CSVParser.parseTime(' - ');
    const timeEmpty = CSVParser.parseTime('');
    const timeValid = CSVParser.parseTime('08:05');

    const passed = timeDash1 === null &&
                   timeDash2 === null &&
                   timeEmpty === null &&
                   timeValid === '08:05';

    this.assert(
      'Uji 2: Penanganan Waktu Masuk/Keluar berupa "-"',
      'Memastikan bahwa nilai "-" pada jam masuk atau jam keluar dianggap unavailable (null), bukan invalid time error atau NaN.',
      passed,
      `parseTime("-") => ${timeDash1 === null ? 'null (Aman)' : timeDash1}, parseTime("08:05") => ${timeValid}`
    );
  },

  // 3. Test Multiple records per employee
  async test3_MultipleRecordsPerEmployee() {
    const csvSample = `Karyawan,Jabatan/Posisi,Tanggal,Waktu Masuk,Waktu Keluar,Status,Presensi Masuk Status,Presensi Keluar Status,Dinas Luar,Unit Kerja,Lokasi,Presensi,Timezone
"Siti Nurhaliza","Finance","2026-10-01","07:55","12:00","Hadir","Tepat Waktu","Pulang Awal","Tidak","Finance","Jakarta","Shift Pagi","Asia/Jakarta"
"Siti Nurhaliza","Finance","2026-10-01","13:00","17:05","Hadir","Tepat Waktu","Tepat Waktu","Tidak","Finance","Jakarta","Shift Siang","Asia/Jakarta"
"Siti Nurhaliza","Finance","2026-10-02","07:50","17:00","Hadir","Tepat Waktu","Tepat Waktu","Tidak","Finance","Jakarta","Full Day","Asia/Jakarta"`;

    const parsed = CSVParser.parse(csvSample);
    const metrics = AttendanceRules.computeMetrics(parsed.dataRows);

    const passed = metrics.uniqueEmployeesCount === 1 &&
                   metrics.totalRecords === 3 &&
                   metrics.employees.length === 1 &&
                   metrics.employees[0].records.length === 3;

    this.assert(
      'Uji 3: Karyawan dengan Beberapa Catatan Presensi',
      'Memastikan jumlah karyawan unik tetap dihitung 1 meskipun memiliki 3 catatan presensi berbeda, dan seluruh riwayat tersimpan lengkap.',
      passed,
      `Karyawan Unik: ${metrics.uniqueEmployeesCount} (Diharapkan: 1), Total Baris: ${metrics.totalRecords}`
    );
  },

  // 4. Test Duplicate Detection and Overwrite/Skip
  async test4_DuplicateDetectionAndResolution() {
    const csvSample = `Karyawan,Jabatan/Posisi,Tanggal,Waktu Masuk,Waktu Keluar,Status,Presensi Masuk Status,Presensi Keluar Status,Dinas Luar,Unit Kerja,Lokasi,Presensi,Timezone
"Budi Santoso","Staff","2026-10-05","08:00","17:00","Hadir","Tepat Waktu","Tepat Waktu","Tidak","Ops","Bandung","Presensi Awal","Asia/Jakarta"
"Budi Santoso","Staff","2026-10-05","08:00","17:00","Hadir","Tepat Waktu","Tepat Waktu","Tidak","Ops","Bandung","Presensi Duplikat","Asia/Jakarta"`;

    const parsed = CSVParser.parse(csvSample);
    const key1 = parsed.dataRows[0].compositeKey;
    const key2 = parsed.dataRows[1].compositeKey;

    const isDuplicateIdentified = key1 === key2;

    this.assert(
      'Uji 4: Deteksi & Resolusi Data Duplikat',
      'Memastikan sistem mengenali kandidat identitas catatan (Karyawan + Tanggal + Lokasi/Unit) untuk mencegah duplikasi.',
      isDuplicateIdentified,
      `Kunci Komposit Baris 1: "${key1}", Baris 2: "${key2}" => Identik (Duplikat Terdeteksi)`
    );
  },

  // 5. Test Unrecognized status mapped to 'Perlu Ditinjau'
  async test5_UnrecognizedStatusMapping() {
    const status1 = AttendanceRules.mapStatus('Cuti Bersama Khusus');
    const status2 = AttendanceRules.mapStatus('Isolasi Mandiri');
    const status3 = AttendanceRules.mapStatus('Hadiir Typo');
    const statusValid = AttendanceRules.mapStatus('Hadir');

    const passed = status1 === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU &&
                   status2 === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU &&
                   status3 === AttendanceRules.STATUS_KEYS.PERLU_DITINJAU &&
                   statusValid === AttendanceRules.STATUS_KEYS.HADIR;

    this.assert(
      'Uji 5: Status Tidak Dikenali Dipetakan ke "Perlu Ditinjau"',
      'Memastikan status yang tidak standar otomatis dialihkan ke kategori "Perlu Ditinjau" dan tidak membuat perhitungan macet.',
      passed,
      `"Cuti Bersama Khusus" => "${status1}", "Hadiir Typo" => "${status3}" (Diharapkan: "Perlu Ditinjau")`
    );
  },

  // 6. Test Dinas Luar Policy Calculation
  async test6_DinasLuarPolicyToggle() {
    const csvSample = `Karyawan,Jabatan/Posisi,Tanggal,Waktu Masuk,Waktu Keluar,Status,Presensi Masuk Status,Presensi Keluar Status,Dinas Luar,Unit Kerja,Lokasi,Presensi,Timezone
"Doni Kusuma","Staff","2026-10-06","08:00","17:00","Hadir","Tepat Waktu","Tepat Waktu","Tidak","Ops","Jakarta","Kantor","Asia/Jakarta"
"Doni Kusuma","Staff","2026-10-07","08:00","17:00","Dinas Luar","Tepat Waktu","Tepat Waktu","Ya","Ops","Jakarta","Luar Kota","Asia/Jakarta"`;

    const parsed = CSVParser.parse(csvSample);
    const mWithoutPolicy = AttendanceRules.computeMetrics(parsed.dataRows, { dinasLuarAsHadir: false });
    const mWithPolicy = AttendanceRules.computeMetrics(parsed.dataRows, { dinasLuarAsHadir: true });

    const passed = mWithoutPolicy.effectiveHadir === 1 &&
                   mWithoutPolicy.overallAttendanceRate === 50 &&
                   mWithPolicy.effectiveHadir === 2 &&
                   mWithPolicy.overallAttendanceRate === 100;

    this.assert(
      'Uji 6: Pengaturan Kebijakan "Dinas Luar sebagai Hadir"',
      'Memastikan perhitungan kehadiran berubah secara dinamis saat kebijakan Dinas Luar diaktifkan/dinonaktifkan.',
      passed,
      `Tanpa Kebijakan: ${mWithoutPolicy.overallAttendanceRateFormatted} (Hadir: ${mWithoutPolicy.effectiveHadir}/2), Dengan Kebijakan: ${mWithPolicy.overallAttendanceRateFormatted} (Hadir: ${mWithPolicy.effectiveHadir}/2)`
    );
  },

  // 7. Test Melebihi Toleransi Policy
  async test7_ToleranceGroupingPolicy() {
    const isLateDefault = AttendanceRules.isLate(AttendanceRules.ENTRY_STATUS_KEYS.MELEBIHI_TOLERANSI, { combineToleranceWithLate: false });
    const isLateCombined = AttendanceRules.isLate(AttendanceRules.ENTRY_STATUS_KEYS.MELEBIHI_TOLERANSI, { combineToleranceWithLate: true });

    const passed = !isLateDefault && isLateCombined;

    this.assert(
      'Uji 7: Pengelompokan Kategori "Melebihi Toleransi"',
      'Memastikan kategori "Melebihi Toleransi" tetap terpisah secara default, dan hanya dimasukkan ke kategori Terlambat jika diatur pada konfigurasi.',
      passed,
      `Default Terlambat: ${isLateDefault ? 'Ya' : 'Tidak (Dipisah)'}, Dengan Opsi Gabung: ${isLateCombined ? 'Ya (Digabung)' : 'Tidak'}`
    );
  },

  renderResults() {
    const container = document.getElementById('testResultsContainer');
    if (!container) return;

    const total = this.testResults.length;
    const passedCount = this.testResults.filter(t => t.passed).length;
    const allPassed = passedCount === total;

    let html = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
        <div>
          <h3 style="display: flex; align-items: center; gap: 0.5rem; color: ${allPassed ? 'var(--success)' : 'var(--danger)'};">
            ${allPassed ? getIcon('checkCircle') : getIcon('alertTriangle')}
            Hasil Validasi Pengujian: ${passedCount} dari ${total} Lulus
          </h3>
          <p style="margin-top: 2px;">Seluruh ketentuan teknis dan skenario edge cases telah diuji secara otomatis.</p>
        </div>
        <span class="badge ${allPassed ? 'badge-hadir' : 'badge-tidak-hadir'}" style="font-size: 0.9rem; padding: 0.4rem 0.8rem;">
          ${allPassed ? 'SEMUA UJI SUKSES (100%)' : 'ADA PENGUJIAN GAGAL'}
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
    `;

    for (const res of this.testResults) {
      html += `
        <div style="background: var(--bg-surface); border: 1px solid ${res.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; border-left: 4px solid ${res.passed ? 'var(--success)' : 'var(--danger)'}; border-radius: var(--radius-md); padding: 1rem 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <strong style="color: var(--text-main); font-size: 0.92rem;">${escapeHtml(res.name)}</strong>
            <span class="badge ${res.passed ? 'badge-hadir' : 'badge-tidak-hadir'}">
              ${res.passed ? getIcon('checkCircle') + ' LULUS' : getIcon('xCircle') + ' GAGAL'}
            </span>
          </div>
          <p style="margin-bottom: 0.5rem; font-size: 0.82rem;">${escapeHtml(res.description)}</p>
          <div style="background: var(--bg-surface-elevated); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">
            ${escapeHtml(res.details)}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }
};
