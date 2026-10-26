/**
 * PresensiPro - Local IndexedDB Storage Manager
 * 100% Client-Side Persistent Database for Attendance Records, Batches, and Policy Configs.
 */

const AppDB = {
  DB_NAME: 'PresensiDB',
  DB_VERSION: 1,
  db: null,

  /**
   * Initialize IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store 1: Attendance Records
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
          recordStore.createIndex('compositeKey', 'compositeKey', { unique: false });
          recordStore.createIndex('karyawan', 'karyawan', { unique: false });
          recordStore.createIndex('tanggal', 'tanggal', { unique: false });
          recordStore.createIndex('batchId', 'batchId', { unique: false });
          recordStore.createIndex('unit_kerja', 'unit_kerja', { unique: false });
          recordStore.createIndex('lokasi', 'lokasi', { unique: false });
          recordStore.createIndex('jabatan', 'jabatan', { unique: false });
          recordStore.createIndex('status', 'status', { unique: false });
        }

        // Store 2: Import Batches (History)
        if (!db.objectStoreNames.contains('batches')) {
          const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
          batchStore.createIndex('importedAt', 'importedAt', { unique: false });
        }

        // Store 3: Application Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  /**
   * Helper for object store transaction
   */
  getTransaction(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { tx, store };
  },

  /**
   * Get all attendance records
   */
  async getAllRecords() {
    return new Promise((resolve, reject) => {
      const { store } = this.getTransaction('records', 'readonly');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Get all import batches (history)
   */
  async getBatches() {
    return new Promise((resolve, reject) => {
      const { store } = this.getTransaction('batches', 'readonly');
      const req = store.getAll();
      req.onsuccess = () => {
        const batches = req.result || [];
        batches.sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt));
        resolve(batches);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Analyze duplicates before saving
   * Checks both existing DB records and within-file duplicate rows
   */
  async checkDuplicates(incomingRecords) {
    const existingRecords = await this.getAllRecords();
    const existingKeyMap = new Map();

    for (const rec of existingRecords) {
      existingKeyMap.set(rec.compositeKey, rec);
    }

    const dbDuplicates = [];
    const intraFileDuplicates = [];
    const seenIncomingKeys = new Set();

    for (const rec of incomingRecords) {
      if (existingKeyMap.has(rec.compositeKey)) {
        dbDuplicates.push({
          incoming: rec,
          existing: existingKeyMap.get(rec.compositeKey)
        });
      }

      if (seenIncomingKeys.has(rec.compositeKey)) {
        intraFileDuplicates.push(rec);
      } else {
        seenIncomingKeys.add(rec.compositeKey);
      }
    }

    return {
      existingDbDuplicateCount: dbDuplicates.length,
      intraFileDuplicateCount: intraFileDuplicates.length,
      dbDuplicates,
      intraFileDuplicates
    };
  },

  /**
   * Save an import batch and its records with duplicate resolution strategy
   * @param {Object} batchMeta
   * @param {Array} records
   * @param {'overwrite'|'skip'} duplicateStrategy
   */
  async saveBatchWithRecords(batchMeta, records, duplicateStrategy = 'overwrite') {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['records', 'batches'], 'readwrite');
      const recordStore = tx.objectStore('records');
      const batchStore = tx.objectStore('batches');

      let savedCount = 0;
      let overwrittenCount = 0;
      let skippedCount = 0;

      // First retrieve existing records to handle overwrite/skip
      const allReq = recordStore.getAll();

      allReq.onsuccess = () => {
        const existingList = allReq.result || [];
        const existingKeyMap = new Map();
        for (const item of existingList) {
          existingKeyMap.set(item.compositeKey, item);
        }

        const seenInThisImport = new Set();

        for (const rec of records) {
          // If duplicate within same file and already saved in this import
          if (seenInThisImport.has(rec.compositeKey)) {
            skippedCount++;
            continue;
          }
          seenInThisImport.add(rec.compositeKey);

          rec.batchId = batchMeta.id;

          if (existingKeyMap.has(rec.compositeKey)) {
            const existing = existingKeyMap.get(rec.compositeKey);
            if (duplicateStrategy === 'overwrite') {
              rec.id = existing.id; // Keep same primary key to update
              recordStore.put(rec);
              overwrittenCount++;
              savedCount++;
            } else {
              // skip
              skippedCount++;
            }
          } else {
            // New record
            delete rec.id;
            recordStore.add(rec);
            savedCount++;
          }
        }

        // Save Batch metadata
        batchMeta.savedCount = savedCount;
        batchMeta.overwrittenCount = overwrittenCount;
        batchMeta.skippedCount = skippedCount;
        batchStore.put(batchMeta);
      };

      tx.oncomplete = () => {
        resolve({
          batchId: batchMeta.id,
          savedCount,
          overwrittenCount,
          skippedCount
        });
      };

      tx.onerror = (e) => reject(tx.error || e);
    });
  },

  /**
   * Delete a batch and all associated records (Rollback import)
   */
  async deleteBatch(batchId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['records', 'batches'], 'readwrite');
      const recordStore = tx.objectStore('records');
      const batchStore = tx.objectStore('batches');

      const batchIndex = recordStore.index('batchId');
      const req = batchIndex.openCursor(IDBKeyRange.only(batchId));

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          recordStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      batchStore.delete(batchId);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Get application settings
   */
  async getSettings() {
    return new Promise((resolve, reject) => {
      const { store } = this.getTransaction('settings', 'readonly');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        const settings = {};
        for (const item of list) {
          settings[item.key] = item.value;
        }
        resolve(settings);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Save a single setting key-value
   */
  async saveSetting(key, value) {
    return new Promise((resolve, reject) => {
      const { store } = this.getTransaction('settings', 'readwrite');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Clear all records and batches
   */
  async clearAllData() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['records', 'batches'], 'readwrite');
      tx.objectStore('records').clear();
      tx.objectStore('batches').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Export all database data to a downloadable JSON backup
   */
  async exportBackup() {
    const records = await this.getAllRecords();
    const batches = await this.getBatches();
    const settings = await this.getSettings();

    return {
      version: 1,
      appName: 'PresensiPro',
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      batchCount: batches.length,
      data: {
        records,
        batches,
        settings
      }
    };
  },

  /**
   * Restore database from backup JSON object
   */
  async importRestore(backupObj, mode = 'overwrite') {
    if (!backupObj || !backupObj.data || !Array.isArray(backupObj.data.records)) {
      throw new Error('Format file backup tidak valid.');
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['records', 'batches', 'settings'], 'readwrite');
      const recordStore = tx.objectStore('records');
      const batchStore = tx.objectStore('batches');
      const settingStore = tx.objectStore('settings');

      if (mode === 'overwrite') {
        recordStore.clear();
        batchStore.clear();
        settingStore.clear();
      }

      for (const rec of backupObj.data.records) {
        recordStore.put(rec);
      }

      if (Array.isArray(backupObj.data.batches)) {
        for (const batch of backupObj.data.batches) {
          batchStore.put(batch);
        }
      }

      if (backupObj.data.settings) {
        for (const [key, value] of Object.entries(backupObj.data.settings)) {
          settingStore.put({ key, value });
        }
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
};
