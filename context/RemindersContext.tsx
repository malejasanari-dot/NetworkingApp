import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recordatorio } from '../constants/MockData';

interface RemindersContextData {
  reminders: Recordatorio[];
  addReminder: (reminder: Omit<Recordatorio, 'id'>) => Promise<void>;
  updateReminder: (id: string, updatedData: Partial<Recordatorio>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  isLoading: boolean;
  getRemindersForContact: (contactId: string) => Recordatorio[];
  getUpcomingReminders: (days?: number) => Recordatorio[];
}

const RemindersContext = createContext<RemindersContextData>({} as RemindersContextData);

const STORAGE_KEY = '@personal_networking_reminders';

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Recordatorio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading reminders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReminders = async (newReminders: Recordatorio[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newReminders));
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  };

  const addReminder = async (data: Omit<Recordatorio, 'id'>) => {
    const newReminder: Recordatorio = {
      ...data,
      id: Date.now().toString(),
    };
    const updated = [newReminder, ...reminders];
    setReminders(updated);
    await saveReminders(updated);
  };

  const updateReminder = async (id: string, updatedData: Partial<Recordatorio>) => {
    const updated = reminders.map(r => r.id === id ? { ...r, ...updatedData } : r);
    setReminders(updated);
    await saveReminders(updated);
  };

  const deleteReminder = async (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    await saveReminders(updated);
  };

  const getRemindersForContact = (contactId: string) => {
    return reminders.filter(r => r.contactoId === contactId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  };

  const getUpcomingReminders = (days: number = 7) => {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    // Normalize dates to start of day for accurate filtering if needed, 
    // but here we just want those >= now and <= future
    return reminders.filter(r => {
      const rDate = new Date(r.fecha);
      return rDate >= now && rDate <= future;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  };

  return (
    <RemindersContext.Provider value={{ 
      reminders, 
      addReminder, 
      updateReminder, 
      deleteReminder, 
      isLoading,
      getRemindersForContact,
      getUpcomingReminders
    }}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useReminders = () => useContext(RemindersContext);
