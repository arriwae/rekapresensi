/**
 * PresensiPro - Intelligent CSV Parser & Column Detector
 * Handles multi-delimiters, varied date formats, BOM cleaning, quotes, and robust schema mapping.
 */

const CSVParser = {
  // Candidate column aliases for fuzzy matching
  COLUMN_PATTERNS: {
    karyawan: ['karyawan', 'nama', 'nama karyawan', 'employee', 'employee name', 'pegawai', 'nama pegawai'],
    id_karyawan: ['id karyawan', 'nik', 'nip', 'employee id', 'id pegawai', 'id', 'user id'],
    jabatan: ['jabatan/posisi', 'jabatan', 'posisi', 'position', 'role', 'title', 'jabatan pegawai'],
    tanggal: ['tanggal', 'date', 'tgl', 'attendance date', 'tanggal presensi'],
    waktu_masuk: ['waktu masuk', 'jam masuk', 'check in', 'check-in', 'masuk', 'in', 'time in', 'clock in'],
    waktu_keluar: ['waktu keluar', 'jam keluar', 'check out', 'check-out', 'keluar', 'out', 'time out', 'clock out'],
    status: ['status', 'status presensi', 'status kehadiran', 'attendance status'],
    presensi_masuk_status: ['presensi masuk status', 'status masuk', 'check in status', 'entry status', 'masuk status'],
    presensi_keluar_status: ['presensi keluar status', 'status keluar', 'check out status', 'exit status', 'keluar status'],
    dinas_luar: ['dinas luar', 'dinas', 'luar kota', 'business trip', 'is_external'],
    unit_kerja: ['unit kerja', 'unit', 'departemen', 'department', 'divisi', 'bagian', 'work unit'],
    lokasi: ['lokasi', 'kantor', 'cabang', 'location', 'office', 'site'],
    presensi: ['presensi', 'keterangan presensi', 'tipe presensi', 'keterangan'],
    timezone: ['timezone', 'zona waktu', 'tz', 'time zone']
  },

  /**
   * Auto-detect CSV delimiter (, ; \t |)
   */
  detectDelimiter(text) {
    const sampleLines = text.split(/\r\n|\n/).slice(0, 5).filter(line => line.trim().length > 0);
    if (sampleLines.length === 0) return ',';

    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxConsistency = -1;

    for (const d of delimiters) {
      const counts = sampleLines.map(line => this.splitCSVLine(line, d).length);
      const firstCount = counts[0];
      const isConsistent = counts.every(c => c === firstCount && c > 1);

      if (isConsistent && firstCount > maxConsistency) {
        maxConsistency = firstCount;
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  },

  /**
   * Split a single CSV line respecting quotes and escaped quotes
   */
  splitCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  },

  /**
   * Clean string and strip BOM
   */
  cleanString(str) {
    if (!str) return '';
    return str.replace(/^\uFEFF/, '').trim();
  },

  /**
   * Normalize column name for comparison
   */
  normalizeHeader(name) {
    return this.cleanString(name)
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Match raw CSV headers to standard internal schema
   */
  mapHeaders(headers) {
    const mapping = {};
    const normalizedHeaders = headers.map(h => this.normalizeHeader(h));

    for (const [targetKey, aliases] of Object.entries(this.COLUMN_PATTERNS)) {
      const matchIndex = normalizedHeaders.findIndex(header => {
        return aliases.some(alias => header === alias || header.includes(alias));
      });

      if (matchIndex !== -1) {
        mapping[targetKey] = {
          index: matchIndex,
          rawName: headers[matchIndex]
        };
      }
    }

    return mapping;
  },

  /**
   * Standardize date string into YYYY-MM-DD
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (!clean || clean === '-') return null;

    // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 2. Common Indonesian / European format: DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. Month Name in text (e.g. 15 Oktober 2026 or 15 Oct 2026)
    const monthNames = {
      jan: '01', januari: '01', january: '01',
      feb: '02', februari: '02', february: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      agu: '08', agustus: '08', aug: '08', august: '08',
      sep: '09', september: '09',
      okt: '10', oktober: '10', oct: '10', october: '10',
      nov: '11', november: '11',
      des: '12', desember: '12', dec: '12', december: '12'
    };

    const textDateMatch = clean.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
    if (textDateMatch) {
      const [, d, monStr, y] = textDateMatch;
      const m = monthNames[monStr.toLowerCase().slice(0, 3)] || monthNames[monStr.toLowerCase()];
      if (m) {
        return `${y}-${m}-${d.padStart(2, '0')}`;
      }
    }

    // 4. Fallback to Date.parse
    const dObj = new Date(clean);
    if (!isNaN(dObj.getTime())) {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return null;
  },

  /**
   * Parse time string into HH:mm format or null if '-' or missing
   */
  parseTime(timeStr) {
    if (!timeStr) return null;
    const clean = timeStr.trim();
    if (clean === '-' || clean === '' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'n/a') {
      return null;
    }
    const match = clean.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      const [, h, m] = match;
      return `${h.padStart(2, '0')}:${m}`;
    }
    return clean;
  },

  /**
   * Parse CSV string into structured preview and mapped records
   */
  parse(rawCSVText) {
    const cleanText = this.cleanString(rawCSVText);
    const delimiter = this.detectDelimiter(cleanText);

    // Split lines
    const rawLines = cleanText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (rawLines.length === 0) {
      throw new Error('File CSV kosong atau tidak memiliki data.');
    }

    const headerLine = rawLines[0];
    const rawHeaders = this.splitCSVLine(headerLine, delimiter);
    const headerMapping = this.mapHeaders(rawHeaders);

    // Validate mandatory columns
    if (!headerMapping.karyawan) {
      throw new Error('Kolom nama karyawan tidak ditemukan. Pastikan terdapat kolom "Karyawan" atau "Nama".');
    }
    if (!headerMapping.tanggal) {
      throw new Error('Kolom tanggal tidak ditemukan. Pastikan terdapat kolom "Tanggal" atau "Date".');
    }
    if (!headerMapping.status) {
      throw new Error('Kolom status tidak ditemukan. Pastikan terdapat kolom "Status".');
    }

    const dataRows = [];
    const previewRows = [];
    const uniqueEmployees = new Set();
    const dates = [];
    let detectedDateFormat = 'YYYY-MM-DD';

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      const cells = this.splitCSVLine(line, delimiter);
      if (cells.length < 2) continue;

      const getVal = (targetKey) => {
        if (!headerMapping[targetKey]) return '';
        const idx = headerMapping[targetKey].index;
        return cells[idx] !== undefined ? cells[idx].trim() : '';
      };

      const employeeName = getVal('karyawan');
      const employeeId = getVal('id_karyawan');
      const rawDate = getVal('tanggal');
      const parsedDate = this.parseDate(rawDate);
      const rawStatus = getVal('status');

      if (!employeeName || !parsedDate) {
        continue;
      }

      uniqueEmployees.add(employeeId || employeeName);
      dates.push(parsedDate);

      // Determine date format indicator
      if (rawDate.includes('/') && rawDate.split('/')[2]?.length === 4) {
        detectedDateFormat = 'DD/MM/YYYY';
      } else if (rawDate.includes('-') && rawDate.split('-')[0]?.length === 4) {
        detectedDateFormat = 'YYYY-MM-DD';
      }

      const record = {
        rowNumber: i,
        karyawan: employeeName,
        id_karyawan: employeeId || null,
        jabatan: getVal('jabatan') || 'Staf',
        tanggal: parsedDate,
        rawTanggal: rawDate,
        waktu_masuk: this.parseTime(getVal('waktu_masuk')),
        waktu_keluar: this.parseTime(getVal('waktu_keluar')),
        status: rawStatus || 'Perlu Ditinjau',
        presensi_masuk_status: getVal('presensi_masuk_status') || 'Tepat Waktu',
        presensi_keluar_status: getVal('presensi_keluar_status') || 'Tepat Waktu',
        dinas_luar: getVal('dinas_luar') || 'Tidak',
        unit_kerja: getVal('unit_kerja') || 'Umum',
        lokasi: getVal('lokasi') || 'Pusat',
        presensi: getVal('presensi') || '',
        timezone: getVal('timezone') || 'Asia/Jakarta'
      };

      // Composite candidate identity for deduplication
      const identityKey = (record.id_karyawan || record.karyawan).trim().toLowerCase() + '|' +
                          record.tanggal + '|' +
                          (record.lokasi || record.unit_kerja || 'default').trim().toLowerCase();
      record.compositeKey = identityKey;

      dataRows.push(record);
      if (previewRows.length < 10) {
        previewRows.push(record);
      }
    }

    dates.sort();
    const minDate = dates[0] || null;
    const maxDate = dates[dates.length - 1] || null;

    return {
      delimiter,
      detectedDateFormat,
      rawHeaders,
      headerMapping,
      totalRows: dataRows.length,
      previewRows,
      dataRows,
      uniqueEmployeeCount: uniqueEmployees.size,
      minDate,
      maxDate
    };
  }
};
