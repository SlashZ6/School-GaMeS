
import { UserProfile, Friend } from '../types';

const DB_NAME = 'GaMeS_DB';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject((event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as any).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result;
      
      // User Store (Single record mostly)
      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user', { keyPath: 'id' });
      }

      // Friends Store
      if (!db.objectStoreNames.contains('friends')) {
        db.createObjectStore('friends', { keyPath: 'id' });
      }
    };
  });
};

export const getUser = async (): Promise<UserProfile | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['user'], 'readonly');
    const store = transaction.objectStore('user');
    const request = store.getAll(); // Get all to find the first one

    request.onsuccess = () => {
      const users = request.result;
      resolve(users.length > 0 ? users[0] : null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveUser = async (user: UserProfile): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['user'], 'readwrite');
    const store = transaction.objectStore('user');
    const request = store.put(user);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const updateUserScore = async (points: number): Promise<void> => {
  const user = await getUser();
  if (user) {
    const newUser = { ...user, totalScore: user.totalScore + points };
    await saveUser(newUser);
  }
};

export const getFriends = async (): Promise<Friend[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['friends'], 'readonly');
    const store = transaction.objectStore('friends');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const addFriend = async (friend: Friend): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['friends'], 'readwrite');
    const store = transaction.objectStore('friends');
    const request = store.put(friend);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteFriend = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['friends'], 'readwrite');
    const store = transaction.objectStore('friends');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
