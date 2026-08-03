import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recordatorio } from '../constants/MockData';
import { generateId } from '../utils/id';

interface RemindersContextData {
  reminders: Recordatorio[];
  addReminder: (reminder: Omit<Recordatorio, 'id'>) => Promise<void>;
  updateReminder: (id: string, updatedData: Partial<Recordatorio>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  deleteRemindersForContact: (contactId: string) => Promise<void>;
  isLoading: boolean;
  getRemindersForContact: (contactId: string) => Recordatorio[];
  getUpcomingReminders: (days?: number) => Recordatorio[];
}

const RemindersContext = createContext<RemindersContextData>({} as RemindersContextData);

const STORAGE_KEY = '@personal_networking_reminders';

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Recordatorio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReminders(parsed);
        } else {
          setReminders([]);
        }
      }
    } catch (e) {
      console.error('Error loading reminders:', e);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReminders = async (newReminders: Recordatorio[]) => {
    if (hasLoadError) {
      console.warn('Save blocked: load failed previously, preserving stored data.');
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newReminders));
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  };

  const addReminder = useCallback(async (data: Omit<Recordatorio, 'id'>) => {
    if (hasLoadError) return;
    const newReminder: Recordatorio = {
      ...data,
      id: generateId(),
    };
    setReminders(prev => {
      const updated = [newReminder, ...prev];
      saveReminders(updated);
      return updated;
    });
  }, [hasLoadError]);

  const updateReminder = useCallback(async (id: string, updatedData: Partial<Recordatorio>) => {
    if (hasLoadError) return;
    setReminders(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...updatedData } : r);
      saveReminders(updated);
      return updated;
    });
  }, [hasLoadError]);

  const deleteReminder = useCallback(async (id: string) => {
    if (hasLoadError) return;
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveReminders(updated);
      return updated;
    });
  }, [hasLoadError]);

  const deleteRemindersForContact = useCallback(async (contactId: string) => {
    if (hasLoadError) return;
    setReminders(prev => {
      const updated = prev.filter(r => r.contactoId !== contactId);
      saveReminders(updated);
      return updated;
    });
  }, [hasLoadError]);

  const getRemindersForContact = useCallback((contactId: string) => {
    return (reminders || [])
      .filter(r => r && r.contactoId === contactId)
      .sort((a, b) => {
        const timeA = a && a.fecha ? new Date(a.fecha).getTime() : 0;
        const timeB = b && b.fecha ? new Date(b.fecha).getTime() : 0;
        const validA = !isNaN(timeA);
        const validB = !isNaN(timeB);
        if (!validA && !validB) return 0;
        if (!validA) return 1;
        if (!validB) return -1;
        return timeA - timeB;
      });
  }, [reminders]);

  const getUpcomingReminders = useCallback((days: number = 7) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const future = new Date(startOfToday);
    future.setDate(startOfToday.getDate() + days);
    future.setHours(23, 59, 59, 999);

    return (reminders || []).filter(r => {
      if (!r || !r.fecha) return false;
      const rTime = new Date(r.fecha).getTime();
      if (isNaN(rTime)) return false;
      const rDate = new Date(rTime);
      return rDate >= startOfToday && rDate <= future;
    }).sort((a, b) => {
      const timeA = new Date(a.fecha).getTime();
      const timeB = new Date(b.fecha).getTime();
      const validA = !isNaN(timeA);
      const validB = !isNaN(timeB);
      if (!validA && !validB) return 0;
      if (!validA) return 1;
      if (!validB) return -1;
      return timeA - timeB;
    });
  }, [reminders]);

  const contextValue = useMemo(() => ({
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    deleteRemindersForContact,
    isLoading,
    getRemindersForContact,
    getUpcomingReminders
  }), [
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    deleteRemindersForContact,
    isLoading,
    getRemindersForContact,
    getUpcomingReminders
  ]);

  return (
    <RemindersContext.Provider value={contextValue}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useReminders = () => useContext(RemindersContext);
