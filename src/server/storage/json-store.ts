import crypto from 'crypto';
// Disk IO removed: in-memory only store
import { logger } from '../logging';

export interface DataStore<T> {
  data: Record<string, T>;
  lastModified: number;
  version: string;
}

export class JSONStore<T> {
  private filePath: string;
  private cache: DataStore<T> | null = null;
  private readonly version = '2.0'; // Updated version for improved locking
  private lockPath: string;
  private lockHeld: boolean = false;
  private operationQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;

  constructor(filename: string, dataDir?: string) {
    // In-memory only; file paths retained for logs/debug only
    this.filePath = `memory://${filename}.json`;
    this.lockPath = `${this.filePath}.lock`;
    logger.debug('Created in-memory JSON store', { filename, filePath: this.filePath });
  }

  async load(): Promise<DataStore<T>> {
    logger.debug('Loading JSON store', { filePath: this.filePath });

    if (!this.cache) {
      this.cache = { data: {}, lastModified: Date.now(), version: this.version };
      logger.info('Initialized empty in-memory JSON store', { filePath: this.filePath });
    }
    return { ...this.cache };
  }

  private async save(): Promise<void> {
    if (!this.cache) return;

    logger.debug('Saving JSON store', { filePath: this.filePath });
    this.cache.lastModified = Date.now();
    // No disk IO
  }

  async create(item: T): Promise<string> {
    const store = await this.load();
    const id = this.generateId();
    store.data[id] = item;
    await this.save();
    // Clear cache to ensure fresh reads
    this.cache = null;
    return id;
  }

  async upsert(id: string, item: T): Promise<void> {
    return this.queueOperation(async () => {
      const store = await this.load();
      store.data[id] = item;
      await this.save();
      // Clear cache to ensure fresh reads
      this.cache = null;
    });
  }

  async findById(id: string): Promise<T | null> {
    const store = await this.load();
    return store.data[id] || null;
  }

  async findMany(filter?: (item: T & { id: string }) => boolean): Promise<Array<T & { id: string }>> {
    const store = await this.load();
    const items = Object.entries(store.data).map(([id, item]) => ({ ...item, id }));
    
    if (filter) {
      return items.filter(filter);
    }
    
    return items;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const store = await this.load();
    const existing = store.data[id];

    if (!existing) return null;

    store.data[id] = { ...existing, ...updates };
    await this.save();
    // Clear cache to ensure fresh reads
    this.cache = null;

    return store.data[id] || null;
  }

  async delete(id: string): Promise<boolean> {
    const store = await this.load();
    if (!(id in store.data)) return false;

    delete store.data[id];
    await this.save();
    // Clear cache to ensure fresh reads
    this.cache = null;

    return true;
  }

  async count(filter?: (item: T & { id: string }) => boolean): Promise<number> {
    const items = await this.findMany(filter);
    return items.length;
  }

  async clear(): Promise<void> {
    const store = await this.load();
    store.data = {};
    await this.save();
    // Clear cache to ensure fresh reads
    this.cache = null;
  }

  private generateId(): string {
    return crypto.createHash('sha256')
      .update(`${Date.now()}-${Math.random()}-${process.hrtime.bigint()}`)
      .digest('hex')
      .substring(0, 16);
  }

  // Queue operations to prevent race conditions
  private async queueOperation(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  // Process queued operations sequentially
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error(`[json-store] Error processing queued operation:`, error);
          // Continue processing other operations even if one fails
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // Execute multiple mutations within a single critical section guarded by a file lock.
  // Ensures all changes are written with one atomic rename.
  async mutate(mutator: (store: DataStore<T>) => void | Promise<void>): Promise<void> {
    return this.queueOperation(async () => {
      const store = await this.load();
      await mutator(store);
      store.lastModified = Date.now();
      this.cache = store;
    });
  }

  private async acquireLock(retries: number = 100, delayMs: number = 10, staleMs: number = 30000): Promise<void> {
    // No-op lock in memory mode
    this.lockHeld = true;
  }

  // Repair corrupted JSON file by replacing with proper structure
  async repairCorruptedFile(): Promise<void> {
    // No-op in memory mode
    logger.debug('repairCorruptedFile noop (in-memory store)', { filePath: this.filePath });
  }

  private async releaseLock(): Promise<void> {
    this.lockHeld = false;
  }
}
