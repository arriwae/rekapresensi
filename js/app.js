/**
 * PresensiPro - Application Orchestrator & Router
 * Coordinates all modules, navigation tabs, toasts, and initialization sequence.
 */

// Global Toast Notification Helper
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconName = 'info';
  let iconColor = 'var(--info)';
  if (type === 'success') { iconName = 'checkCircle'; iconColor = 'var(--success)'; }
  else if (type === 'danger') { iconName = 'alertTriangle'; iconColor = 'var(--danger)'; }
  else if (type === 'warning') { iconName = 'alertCircle'; iconColor = 'var(--warning)'; }

  toast.innerHTML = `
    <div class="toast-icon" style="color: ${iconColor};">${getIcon(iconName)}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

const App = {
  async init() {
    console.log('PresensiPro initializing...');

    // 1. Setup Tab Navigation
    this.setupTabs();

    // 2. Setup Mobile Sidebar
    this.setupMobileMenu();

    // 3. Initialize IndexedDB
    try {
      await AppDB.init();
      console.log('IndexedDB PresensiDB initialized.');
    } catch (err) {
      console.error('Failed to initialize IndexedDB:', err);
      showToast('Database Error', 'Gagal memuat IndexedDB lokal: ' + err.message, 'danger');
    }

    // 4. Initialize UI Modules
    UIImporter.init();
    UIDashboard.init();
    UIEmployees.init();
    UIComparison.init();
    UIExport.init();
    UISettings.init();
    AppTestSuite.init();

    // 5. Load State from DB
    await AppState.loadFromDB();

    // Update database status badge in sidebar
    this.updateDBStatus();
    AppState.subscribe('RECORDS_LOADED', () => this.updateDBStatus());
    AppState.subscribe('DATA_UPDATED', () => this.updateDBStatus());

    // If completely empty, auto-prompt to load sample data or show banner
    if (AppState.allRecords.length === 0) {
      document.getElementById('emptyDataBanner')?.style.setProperty('display', 'block');
    } else {
      document.getElementById('emptyDataBanner')?.style.setProperty('display', 'none');
    }

    // 6. Register Service Worker for Offline PWA
    this.registerServiceWorker();

    console.log('PresensiPro ready.');
  },

  setupTabs() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('headerPageTitle');

    const titles = {
      tabDashboard: 'Dashboard Rekap Presensi',
      tabImport: 'Impor Data Presensi',
      tabEmployees: 'Rekap Individual Karyawan',
      tabComparison: 'Perbandingan Antarbulan',
      tabExport: 'Pusat Ekspor Laporan',
      tabSettings: 'Pengaturan Kebijakan & Sistem',
      tabTests: 'Pusat Pengujian & Validasi'
    };

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');

        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        tabContents.forEach(tc => {
          if (tc.id === targetTab) {
            tc.classList.add('active');
          } else {
            tc.classList.remove('active');
          }
        });

        if (pageTitle && titles[targetTab]) {
          pageTitle.textContent = titles[targetTab];
        }

        // On mobile, close sidebar after clicking
        const sidebar = document.querySelector('.app-sidebar');
        if (sidebar && window.innerWidth <= 1024) {
          sidebar.classList.remove('open');
        }

        // Tab-specific callbacks
        if (targetTab === 'tabComparison') {
          UIComparison.runComparison();
        } else if (targetTab === 'tabTests' && AppTestSuite.testResults.length === 0) {
          AppTestSuite.runAllTests();
        }
      });
    });
  },

  setupMobileMenu() {
    const btnToggle = document.getElementById('btnToggleSidebar');
    const sidebar = document.querySelector('.app-sidebar');

    if (btnToggle && sidebar) {
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  },

  updateDBStatus() {
    const statusText = document.getElementById('sidebarDbRecordCount');
    if (statusText) {
      statusText.textContent = `${AppState.allRecords.length.toLocaleString()} catatan`;
    }

    const banner = document.getElementById('emptyDataBanner');
    if (banner) {
      banner.style.display = AppState.allRecords.length === 0 ? 'block' : 'none';
    }
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(() => console.log('Service Worker registered successfully for offline support.'))
          .catch(err => console.log('Service Worker registration skipped or failed:', err));
      });
    }
  }
};

// Start application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
