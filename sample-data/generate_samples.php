<?php
// Script to generate rich sample datasets for presensi
$departments = [
    'IT & Digital' => ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'System Administrator', 'DevOps Specialist'],
    'Operasional' => ['Staff Operasional', 'Koordinator Lapangan', 'Admin Operasional', 'Supervisor Operasional'],
    'Keuangan' => ['Staff Accounting', 'Finance Officer', 'Tax Specialist'],
    'SDM & Umum' => ['HR Generalist', 'Recruitment Specialist', 'General Affair Staff'],
    'Pemasaran' => ['Marketing Specialist', 'Content Creator', 'Account Executive']
];

$locations = ['Kantor Pusat Jakarta', 'Cabang Bandung', 'Cabang Surabaya'];

$employees = [
    ['nama' => 'Ahmad Fauzi', 'dept' => 'IT & Digital', 'pos' => 'Software Engineer', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Siti Nurhaliza', 'dept' => 'Keuangan', 'pos' => 'Finance Officer', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Budi Santoso', 'dept' => 'Operasional', 'pos' => 'Koordinator Lapangan', 'loc' => 'Cabang Bandung'],
    ['nama' => 'Dewi Lestari', 'dept' => 'SDM & Umum', 'pos' => 'HR Generalist', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Rian Hidayat', 'dept' => 'IT & Digital', 'pos' => 'Frontend Developer', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Putri Ayu', 'dept' => 'Pemasaran', 'pos' => 'Marketing Specialist', 'loc' => 'Cabang Surabaya'],
    ['nama' => 'Eko Prasetyo', 'dept' => 'Operasional', 'pos' => 'Staff Operasional', 'loc' => 'Cabang Bandung'],
    ['nama' => 'Maya Indah', 'dept' => 'Keuangan', 'pos' => 'Staff Accounting', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Fajar Nugraha', 'dept' => 'IT & Digital', 'pos' => 'Backend Developer', 'loc' => 'Cabang Bandung'],
    ['nama' => 'Lestari Handayani', 'dept' => 'Pemasaran', 'pos' => 'Content Creator', 'loc' => 'Cabang Surabaya'],
    ['nama' => 'Doni Kusuma', 'dept' => 'Operasional', 'pos' => 'Supervisor Operasional', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Anisa Rahma', 'dept' => 'SDM & Umum', 'pos' => 'General Affair Staff', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Hendra Setiawan', 'dept' => 'Keuangan', 'pos' => 'Tax Specialist', 'loc' => 'Kantor Pusat Jakarta'],
    ['nama' => 'Ratna Sari', 'dept' => 'Pemasaran', 'pos' => 'Account Executive', 'loc' => 'Cabang Surabaya'],
    ['nama' => 'Dimas Aditya', 'dept' => 'IT & Digital', 'pos' => 'DevOps Specialist', 'loc' => 'Kantor Pusat Jakarta']
];

function generateMonthCSV($year, $month, $filename, $employees, $locations) {
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
    $header = "Karyawan,Jabatan/Posisi,Tanggal,Waktu Masuk,Waktu Keluar,Status,Presensi Masuk Status,Presensi Keluar Status,Dinas Luar,Unit Kerja,Lokasi,Presensi,Timezone\n";
    $rows = [];

    // Specific national holidays in Indonesia (e.g. 1 Oktober Hari Kesaktian Pancasila / mock holiday)
    $holidays = [
        10 => [1, 24], // 1 Oct, 24 Oct
        11 => [10] // 10 Nov Hari Pahlawan
    ];

    for ($d = 1; $d <= $daysInMonth; $d++) {
        $dateStr = sprintf("%04d-%02d-%02d", $year, $month, $d);
        $dayOfWeek = date('N', strtotime($dateStr)); // 1 (Mon) - 7 (Sun)
        $isWeekend = ($dayOfWeek == 6 || $dayOfWeek == 7);
        $isHoliday = isset($holidays[$month]) && in_array($d, $holidays[$month]);

        foreach ($employees as $idx => $emp) {
            $name = $emp['nama'];
            $pos = $emp['pos'];
            $dept = $emp['dept'];
            $loc = $emp['loc'];

            if ($isWeekend || $isHoliday) {
                // Hari Libur
                $status = "Hari Libur";
                $inTime = "-";
                $outTime = "-";
                $inStatus = "Tidak Hadir";
                $outStatus = "Tidak Hadir";
                $dinasLuar = "Tidak";
                $presensi = "Libur";
            } else {
                // Working day distribution
                $seed = ($idx * 37 + $d * 19) % 100;

                if ($seed < 70) {
                    // Hadir Tepat Waktu
                    $status = "Hadir";
                    $inMinute = rand(45, 59);
                    $inTime = sprintf("07:%02d", $inMinute);
                    $outMinute = rand(5, 30);
                    $outTime = sprintf("17:%02d", $outMinute);
                    $inStatus = "Tepat Waktu";
                    $outStatus = "Tepat Waktu";
                    $dinasLuar = "Tidak";
                    $presensi = "Presensi Lengkap";
                } elseif ($seed < 82) {
                    // Terlambat
                    $status = "Hadir";
                    $inMinute = rand(5, 25);
                    $inTime = sprintf("08:%02d", $inMinute);
                    $outTime = sprintf("17:%02d", rand(0, 20));
                    $inStatus = "Terlambat";
                    $outStatus = "Tepat Waktu";
                    $dinasLuar = "Tidak";
                    $presensi = "Presensi Lengkap";
                } elseif ($seed < 87) {
                    // Melebihi Toleransi
                    $status = "Hadir";
                    $inMinute = rand(35, 55);
                    $inTime = sprintf("08:%02d", $inMinute);
                    $outTime = sprintf("17:%02d", rand(0, 15));
                    $inStatus = "Melebihi Toleransi";
                    $outStatus = "Tepat Waktu";
                    $dinasLuar = "Tidak";
                    $presensi = "Presensi Lengkap";
                } elseif ($seed < 91) {
                    // Pulang Awal
                    $status = "Hadir";
                    $inTime = sprintf("07:%02d", rand(50, 58));
                    $outTime = sprintf("16:%02d", rand(10, 40));
                    $inStatus = "Tepat Waktu";
                    $outStatus = "Pulang Awal";
                    $dinasLuar = "Tidak";
                    $presensi = "Presensi Lengkap";
                } elseif ($seed < 94) {
                    // Dinas Luar
                    $status = "Dinas Luar";
                    $inTime = sprintf("08:%02d", rand(0, 30));
                    $outTime = sprintf("17:%02d", rand(0, 30));
                    $inStatus = "Tepat Waktu";
                    $outStatus = "Tepat Waktu";
                    $dinasLuar = "Ya";
                    $presensi = "Presensi Dinas Luar";
                } elseif ($seed < 96) {
                    // Izin
                    $status = "Izin";
                    $inTime = "-";
                    $outTime = "-";
                    $inStatus = "Tidak Hadir";
                    $outStatus = "Tidak Hadir";
                    $dinasLuar = "Tidak";
                    $presensi = "Izin Resmi";
                } elseif ($seed < 98) {
                    // Sakit
                    $status = "Sakit";
                    $inTime = "-";
                    $outTime = "-";
                    $inStatus = "Tidak Hadir";
                    $outStatus = "Tidak Hadir";
                    $dinasLuar = "Tidak";
                    $presensi = "Surat Dokter";
                } else {
                    // Tidak Hadir (Alpha)
                    $status = "Tidak Hadir";
                    $inTime = "-";
                    $outTime = "-";
                    $inStatus = "Tidak Hadir";
                    $outStatus = "Tidak Hadir";
                    $dinasLuar = "Tidak";
                    $presensi = "Alpha";
                }
            }

            $rows[] = sprintf(
                '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","Asia/Jakarta"',
                $name, $pos, $dateStr, $inTime, $outTime, $status, $inStatus, $outStatus, $dinasLuar, $dept, $loc, $presensi
            );
        }
    }

    file_put_contents($filename, $header . implode("\n", $rows));
    echo "Generated $filename (" . count($rows) . " rows)\n";
}

generateMonthCSV(2026, 10, 'sample-data/presensi_oktober_2026.csv', $employees, $locations);
generateMonthCSV(2026, 11, 'sample-data/presensi_november_2026.csv', $employees, $locations);

// Generate Edge Cases CSV specifically designed for testing!
$edgeHeader = "Karyawan,Jabatan/Posisi,Tanggal,Waktu Masuk,Waktu Keluar,Status,Presensi Masuk Status,Presensi Keluar Status,Dinas Luar,Unit Kerja,Lokasi,Presensi,Timezone\n";
$edgeRows = [
    // 1. Status Hari Libur (must be excluded from working day denominator)
    '"Ahmad Fauzi","Software Engineer","2026-10-04","-","-","Hari Libur","Tidak Hadir","Tidak Hadir","Tidak","IT & Digital","Kantor Pusat Jakarta","Libur Mingguan","Asia/Jakarta"',
    '"Siti Nurhaliza","Finance Officer","2026-10-04","-","-","Hari Libur","Tidak Hadir","Tidak Hadir","Tidak","Keuangan","Kantor Pusat Jakarta","Libur Mingguan","Asia/Jakarta"',
    
    // 2. Waktu Masuk/Keluar berupa '-' (must be treated as unavailable, not invalid error)
    '"Budi Santoso","Koordinator Lapangan","2026-10-05","-","-","Sakit","Tidak Hadir","Tidak Hadir","Tidak","Operasional","Cabang Bandung","Surat Keterangan Sakit","Asia/Jakarta"',
    '"Dewi Lestari","HR Generalist","2026-10-05","-","-","Izin","Tidak Hadir","Tidak Hadir","Tidak","SDM & Umum","Kantor Pusat Jakarta","Izin Pribadi","Asia/Jakarta"',
    '"Rian Hidayat","Frontend Developer","2026-10-05","08:05","-","Hadir","Terlambat","Tidak Hadir","Tidak","IT & Digital","Kantor Pusat Jakarta","Lupa Tap Pulang","Asia/Jakarta"',

    // 3. Karyawan dengan multiple records (misal re-tap or split shift)
    '"Ahmad Fauzi","Software Engineer","2026-10-06","07:55","12:00","Hadir","Tepat Waktu","Pulang Awal","Tidak","IT & Digital","Kantor Pusat Jakarta","Shift 1","Asia/Jakarta"',
    '"Ahmad Fauzi","Software Engineer","2026-10-06","13:00","17:15","Hadir","Tepat Waktu","Tepat Waktu","Tidak","IT & Digital","Kantor Pusat Jakarta","Shift 2","Asia/Jakarta"',

    // 4. Data Duplikat (Identical composite key: Ahmad Fauzi + 2026-10-07 + Kantor Pusat Jakarta)
    '"Ahmad Fauzi","Software Engineer","2026-10-07","07:50","17:10","Hadir","Tepat Waktu","Tepat Waktu","Tidak","IT & Digital","Kantor Pusat Jakarta","Presensi Reguler","Asia/Jakarta"',
    '"Ahmad Fauzi","Software Engineer","2026-10-07","07:50","17:10","Hadir","Tepat Waktu","Tepat Waktu","Tidak","IT & Digital","Kantor Pusat Jakarta","Presensi Reguler (Duplikat)","Asia/Jakarta"',

    // 5. Status Tidak Dikenali (Must be categorized as 'Perlu Ditinjau')
    '"Eko Prasetyo","Staff Operasional","2026-10-08","08:10","17:00","Cuti Bersama","Tepat Waktu","Tepat Waktu","Tidak","Operasional","Cabang Bandung","Cuti Bersama Khusus","Asia/Jakarta"',
    '"Putri Ayu","Marketing Specialist","2026-10-08","-","-","Isolasi Mandiri","Tidak Hadir","Tidak Hadir","Tidak","Pemasaran","Cabang Surabaya","Karantina","Asia/Jakarta"',
    '"Maya Indah","Staff Accounting","2026-10-08","07:45","17:05","Hadiir Typo","Tepat Waktu","Tepat Waktu","Tidak","Keuangan","Kantor Pusat Jakarta","Kesalahan Input","Asia/Jakarta"',

    // 6. Melebihi Toleransi test
    '"Fajar Nugraha","Backend Developer","2026-10-08","08:45","17:30","Hadir","Melebihi Toleransi","Tepat Waktu","Tidak","IT & Digital","Cabang Bandung","Terlambat Parah","Asia/Jakarta"',

    // 7. Dinas Luar dengan 'Ya'
    '"Doni Kusuma","Supervisor Operasional","2026-10-08","08:00","18:00","Dinas Luar","Tepat Waktu","Tepat Waktu","Ya","Operasional","Kantor Pusat Jakarta","Kunjungan Proyek Luar Kota","Asia/Jakarta"'
];

file_put_contents('sample-data/presensi_edge_cases_test.csv', $edgeHeader . implode("\n", $edgeRows));
echo "Generated sample-data/presensi_edge_cases_test.csv (" . count($edgeRows) . " rows)\n";
