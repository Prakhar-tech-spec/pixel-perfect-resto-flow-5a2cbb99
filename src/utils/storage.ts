import { openDB, DBSchema } from 'idb';

// Define the types for each store's items
export interface InventoryItem {
  id?: number;
  name: string;
  quantity: number;
  price: number;
  date: string;
  paymentMode: string;
  notes?: string;
  isSale?: boolean;
  timestamp?: string;
}

export interface StaffMember {
  id?: number;
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  employeeId?: string;
  workingHours?: string;
  salary: number;
  paymentType: string;
  lastPaidOn?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id?: number;
  staffId: number;
  staffName: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  notes?: string;
}

export interface SalesRecord {
  id?: number;
  date: string;
  amount: number;
  paymentMode: string;
  notes?: string;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  date: string;
}

// Define store names as a const array for type safety
const STORE_NAMES = [
  'inventory_items',
  'staff_members',
  'attendance_records',
  'sales_records',
  'notes',
] as const;

type StoreNameTuple = typeof STORE_NAMES;
type StoreName = StoreNameTuple[number];

// Define the store schema
interface StoreSchema extends DBSchema {
  inventory_items: {
    key: number;
    value: InventoryItem;
  };
  staff_members: {
    key: number;
    value: StaffMember;
  };
  attendance_records: {
    key: number;
    value: AttendanceRecord;
  };
  sales_records: {
    key: number;
    value: SalesRecord;
  };
  notes: {
    key: number;
    value: Note;
  };
}

class StorageService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'restaurant-db';
  private readonly version = 1;
  private readonly stores: StoreName[] = [...STORE_NAMES];
  private dbInitPromise: Promise<void> | null = null;

  constructor() {
    this.dbInitPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        this.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
    });
  }

  private async waitForDB(): Promise<void> {
    if (this.db) return Promise.resolve();
    return this.dbInitPromise || this.initDB();
  }

  async getItem<T extends StoreName>(storeName: T): Promise<StoreSchema[T]['value'][]> {
    await this.waitForDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName as string, 'readonly');
      const store = transaction.objectStore(storeName as string);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as StoreSchema[T]['value'][]);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async setItem<T extends StoreName>(storeName: T, items: StoreSchema[T]['value'][]): Promise<void> {
    await this.waitForDB();
    if (!this.db) throw new Error('Database not initialized');
    if (!Array.isArray(items)) throw new Error('Items must be an array');

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(storeName as string, 'readwrite');
      const store = transaction.objectStore(storeName as string);

      store.clear();

      items.forEach((item) => {
        store.add(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getItemById<T extends StoreName>(storeName: T, id: number): Promise<StoreSchema[T]['value'] | undefined> {
    await this.waitForDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName as string, 'readonly');
      const store = transaction.objectStore(storeName as string);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as StoreSchema[T]['value']);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteItem<T extends StoreName>(storeName: T, id: number): Promise<void> {
    await this.waitForDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName as string, 'readwrite');
      const store = transaction.objectStore(storeName as string);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const storage = new StorageService(); 