import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
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
const MIGRATION_FLAG_KEY = (userId: string) => `@reminders_migrated_to_supabase_${userId}`;

const mapRowToReminder = (row: any): Recordatorio => ({
  id: row.id,
  contactoId: row.contacto_id,
  fecha: row.fecha || new Date().toISOString(),
  nota: row.nota || '',
});

const mapReminderToRow = (reminder: Partial<Recordatorio>, userId: string) => {
  const row: any = {
    user_id: userId,
  };
  if (reminder.id !== undefined) row.id = reminder.id;
  if (reminder.contactoId !== undefined) row.contacto_id = reminder.contactoId;
  if (reminder.fecha !== undefined) row.fecha = reminder.fecha;
  if (reminder.nota !== undefined) row.nota = reminder.nota;
  return row;
};

const migrateLocalRemindersIfNeeded = async (userId: string, currentDbReminders: any[]) => {
  try {
    const isCompleted = await AsyncStorage.getItem(MIGRATION_FLAG_KEY(userId));
    if (isCompleted === 'true') {
      return currentDbReminders;
    }

    const { data: dbContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId);

    const validContactIds = new Set((dbContacts || []).map(c => c.id));
    if (validContactIds.size === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbReminders;
    }

    let localReminders: Recordatorio[] = [];
    const storedStr = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedStr) {
      try {
        const parsed = JSON.parse(storedStr);
        if (Array.isArray(parsed)) localReminders = parsed;
      } catch {
        localReminders = [];
      }
    }

    if (localReminders.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbReminders;
    }

    let allMigratedSuccessfully = true;
    const existingDbIds = new Set(currentDbReminders.map(r => r.id));
    const existingDbReminderKeys = new Set(
      currentDbReminders.map(r => `${r.contacto_id}_${r.nota.trim()}_${r.fecha}`)
    );

    for (let i = 0; i < localReminders.length; i++) {
      const reminder = localReminders[i];
      if (!reminder || !reminder.contactoId || !reminder.fecha) continue;

      if (!validContactIds.has(reminder.contactoId)) {
        continue;
      }

      const reminderKey = `${reminder.contactoId}_${(reminder.nota || '').trim()}_${reminder.fecha}`;
      const isAlreadyInDb = existingDbIds.has(reminder.id) || existingDbReminderKeys.has(reminderKey);

      if (isAlreadyInDb) {
        continue;
      }

      let targetId = reminder.id;
      const { data: existingWithId } = await supabase
        .from('reminders')
        .select('id, user_id')
        .eq('id', targetId)
        .maybeSingle();

      if (existingWithId) {
        if (existingWithId.user_id === userId) {
          continue;
        } else {
          targetId = generateId(i);
        }
      }

      const rowToInsert = mapReminderToRow({ ...reminder, id: targetId }, userId);
      const { error: insertError } = await supabase.from('reminders').insert(rowToInsert);

      if (insertError) {
        console.error(`Error migrando recordatorio ${reminder.id}:`, insertError);
        allMigratedSuccessfully = false;
      } else {
        existingDbIds.add(targetId);
      }
    }

    if (allMigratedSuccessfully) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
    }

    const { data: updatedDbReminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: true });

    return updatedDbReminders || currentDbReminders;
  } catch (err) {
    console.error('Error durante la migración de recordatorios:', err);
    return currentDbReminders;
  }
};

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Recordatorio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadReminders = useCallback(async () => {
    if (!user?.id) {
      setReminders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: true });

      if (error) {
        console.error('Error fetching reminders from Supabase:', error);
        setIsLoading(false);
        return;
      }

      let finalRows = data || [];
      finalRows = await migrateLocalRemindersIfNeeded(user.id, finalRows);

      setReminders(finalRows.map(mapRowToReminder));
    } catch (err) {
      console.error('Error in loadReminders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const addReminder = useCallback(async (data: Omit<Recordatorio, 'id'>) => {
    if (!user?.id) return;

    const newReminder: Recordatorio = {
      ...data,
      id: generateId(),
    };

    const row = mapReminderToRow(newReminder, user.id);
    const { data: insertedData, error } = await supabase
      .from('reminders')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting reminder in Supabase:', error);
      throw error;
    }

    const insertedReminder = insertedData ? mapRowToReminder(insertedData) : newReminder;

    setReminders(prev => [insertedReminder, ...(Array.isArray(prev) ? prev : [])]);
  }, [user?.id]);

  const updateReminder = useCallback(async (id: string, updatedData: Partial<Recordatorio>) => {
    if (!user?.id) return;

    const rowUpdate = mapReminderToRow(updatedData, user.id);
    delete rowUpdate.id;

    const { error } = await supabase
      .from('reminders')
      .update(rowUpdate)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating reminder in Supabase:', error);
      throw error;
    }

    setReminders(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(r => (r && r.id === id ? { ...r, ...updatedData } : r));
    });
  }, [user?.id]);

  const deleteReminder = useCallback(async (id: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting reminder from Supabase:', error);
      throw error;
    }

    setReminders(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.filter(r => r && r.id !== id);
    });
  }, [user?.id]);

  const deleteRemindersForContact = useCallback(async (contactId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('contacto_id', contactId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting reminders for contact from Supabase:', error);
      throw error;
    }

    setReminders(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.filter(r => r && r.contactoId !== contactId);
    });
  }, [user?.id]);

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
