import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Recordatorio } from '../constants/MockData';
import { generateId } from '../utils/id';
import { 
  scheduleReminderNotification, 
  cancelReminderNotification, 
  cancelReminderNotificationByReminderId 
} from '../hooks/useNotifications';

interface RemindersContextData {
  reminders: Recordatorio[];
  addReminder: (reminder: Omit<Recordatorio, 'id'>, contactName?: string) => Promise<void>;
  updateReminder: (id: string, updatedData: Partial<Recordatorio>, contactName?: string) => Promise<void>;
  toggleCompleteReminder: (id: string, contactName?: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  deleteRemindersForContact: (contactId: string) => Promise<void>;
  isLoading: boolean;
  getRemindersForContact: (contactId: string) => Recordatorio[];
  getUpcomingReminders: (days?: number) => Recordatorio[];
}

const RemindersContext = createContext<RemindersContextData>({} as RemindersContextData);

const STORAGE_KEY = '@personal_networking_reminders';
const USER_CACHE_KEY = (userId: string) => `@personal_networking_reminders_cache_${userId}`;
const MIGRATION_FLAG_KEY = (userId: string) => `@reminders_migrated_to_supabase_${userId}`;

const mapRowToReminder = (row: any): Recordatorio => ({
  id: row.id,
  contactoId: row.contacto_id,
  fecha: row.fecha || new Date().toISOString(),
  nota: row.nota || '',
  completado: Boolean(row.completado),
  notificacionId: row.notificacion_id || undefined,
});

const mapReminderToRow = (reminder: Partial<Recordatorio>, userId: string) => {
  const row: any = {
    user_id: userId,
  };
  if (reminder.id !== undefined) row.id = reminder.id;
  if (reminder.contactoId !== undefined) row.contacto_id = reminder.contactoId;
  if (reminder.fecha !== undefined) row.fecha = reminder.fecha;
  if (reminder.nota !== undefined) row.nota = reminder.nota;
  if (reminder.completado !== undefined) row.completado = reminder.completado;
  if (reminder.notificacionId !== undefined) row.notificacion_id = reminder.notificacionId;
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

  // Helper para persistir caché local por usuario
  const persistLocalCache = useCallback(async (userId: string, items: Recordatorio[]) => {
    try {
      await AsyncStorage.setItem(USER_CACHE_KEY(userId), JSON.stringify(items));
    } catch (e) {
      console.error('Error guardando caché de recordatorios:', e);
    }
  }, []);

  const loadReminders = useCallback(async () => {
    if (!user?.id) {
      setReminders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Cargar caché local primero para respuesta inmediata
      let localCachedMap: Record<string, Recordatorio> = {};
      try {
        const cachedStr = await AsyncStorage.getItem(USER_CACHE_KEY(user.id));
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (Array.isArray(parsed)) {
            parsed.forEach(r => {
              if (r && r.id) localCachedMap[r.id] = r;
            });
          }
        }
      } catch {}

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: true });

      if (error) {
        console.error('Error fetching reminders from Supabase:', error);
        // Fallback a caché local si hay error de red
        if (Object.keys(localCachedMap).length > 0) {
          setReminders(Object.values(localCachedMap));
        }
        setIsLoading(false);
        return;
      }

      let finalRows = data || [];
      finalRows = await migrateLocalRemindersIfNeeded(user.id, finalRows);

      const mappedReminders = finalRows.map(row => {
        const r = mapRowToReminder(row);
        // Si el backend aún no tiene la columna completado/notificacion_id, recuperar de caché local
        const cached = localCachedMap[r.id];
        if (cached) {
          if (r.completado === undefined || r.completado === false) {
            r.completado = cached.completado || false;
          }
          if (!r.notificacionId && cached.notificacionId) {
            r.notificacionId = cached.notificacionId;
          }
        }
        return r;
      });

      setReminders(mappedReminders);
      await persistLocalCache(user.id, mappedReminders);
    } catch (err) {
      console.error('Error in loadReminders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, persistLocalCache]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const addReminder = useCallback(async (data: Omit<Recordatorio, 'id'>, contactName?: string) => {
    if (!user?.id) return;

    const newId = generateId();
    let notifId: string | null = null;

    // Solo programar notificación si no está completado
    if (!data.completado) {
      notifId = await scheduleReminderNotification({
        reminderId: newId,
        contactId: data.contactoId,
        contactName,
        nota: data.nota,
        fecha: data.fecha,
      });
    }

    const newReminder: Recordatorio = {
      ...data,
      id: newId,
      completado: data.completado || false,
      notificacionId: notifId || undefined,
    };

    // Intentar insertar en Supabase de forma segura
    try {
      const row = mapReminderToRow(newReminder, user.id);
      const { data: insertedData, error } = await supabase
        .from('reminders')
        .insert(row)
        .select()
        .single();

      if (error) {
        // Fallback si las columnas opcionales aún no existen en Postgres
        const isColumnError = error.message && (
          error.message.includes('completado') || 
          error.message.includes('notificacion_id') || 
          (error as any).code === 'PGRST204'
        );
        if (isColumnError) {
          const fallbackRow = {
            id: newReminder.id,
            user_id: user.id,
            contacto_id: newReminder.contactoId,
            fecha: newReminder.fecha,
            nota: newReminder.nota,
          };
          await supabase.from('reminders').insert(fallbackRow);
        } else {
          console.error('Error inserting reminder in Supabase:', error);
        }
      }
    } catch (err) {
      console.error('Error in addReminder insert:', err);
    }

    setReminders(prev => {
      const updated = [newReminder, ...(Array.isArray(prev) ? prev : [])];
      persistLocalCache(user.id, updated);
      return updated;
    });
  }, [user?.id, persistLocalCache]);

  const updateReminder = useCallback(async (id: string, updatedData: Partial<Recordatorio>, contactName?: string) => {
    if (!user?.id) return;

    const existing = (reminders || []).find(r => r.id === id);
    const merged: Recordatorio = {
      id,
      contactoId: updatedData.contactoId ?? existing?.contactoId ?? '',
      fecha: updatedData.fecha ?? existing?.fecha ?? new Date().toISOString(),
      nota: updatedData.nota ?? existing?.nota ?? '',
      completado: updatedData.completado !== undefined ? updatedData.completado : (existing?.completado ?? false),
      notificacionId: existing?.notificacionId,
    };

    // Cancelar notificación previa
    await cancelReminderNotification(existing?.notificacionId);
    await cancelReminderNotificationByReminderId(id);

    // Programar nueva notificación si no está completado y fecha es futura
    if (!merged.completado) {
      const notifId = await scheduleReminderNotification({
        reminderId: id,
        contactId: merged.contactoId,
        contactName,
        nota: merged.nota,
        fecha: merged.fecha,
      });
      merged.notificacionId = notifId || undefined;
    } else {
      merged.notificacionId = undefined;
    }

    try {
      const rowUpdate = mapReminderToRow(merged, user.id);
      delete rowUpdate.id;

      const { error } = await supabase
        .from('reminders')
        .update(rowUpdate)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        const isColumnError = error.message && (
          error.message.includes('completado') || 
          error.message.includes('notificacion_id') || 
          (error as any).code === 'PGRST204'
        );
        if (isColumnError) {
          const fallbackRow: any = {};
          if (updatedData.contactoId !== undefined) fallbackRow.contacto_id = updatedData.contactoId;
          if (updatedData.fecha !== undefined) fallbackRow.fecha = updatedData.fecha;
          if (updatedData.nota !== undefined) fallbackRow.nota = updatedData.nota;
          if (Object.keys(fallbackRow).length > 0) {
            await supabase.from('reminders').update(fallbackRow).eq('id', id).eq('user_id', user.id);
          }
        } else {
          console.error('Error updating reminder in Supabase:', error);
        }
      }
    } catch (err) {
      console.error('Error in updateReminder update:', err);
    }

    setReminders(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const updated = current.map(r => (r && r.id === id ? merged : r));
      persistLocalCache(user.id, updated);
      return updated;
    });
  }, [user?.id, reminders, persistLocalCache]);

  const toggleCompleteReminder = useCallback(async (id: string, contactName?: string) => {
    const existing = (reminders || []).find(r => r.id === id);
    if (!existing) return;
    const newCompletado = !existing.completado;
    await updateReminder(id, { completado: newCompletado }, contactName);
  }, [reminders, updateReminder]);

  const deleteReminder = useCallback(async (id: string) => {
    if (!user?.id) return;

    const existing = (reminders || []).find(r => r.id === id);
    if (existing?.notificacionId) {
      await cancelReminderNotification(existing.notificacionId);
    }
    await cancelReminderNotificationByReminderId(id);

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting reminder from Supabase:', error);
      }
    } catch (err) {
      console.error('Error in deleteReminder supabase:', err);
    }

    setReminders(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const updated = current.filter(r => r && r.id !== id);
      persistLocalCache(user.id, updated);
      return updated;
    });
  }, [user?.id, reminders, persistLocalCache]);

  const deleteRemindersForContact = useCallback(async (contactId: string) => {
    if (!user?.id) return;

    const contactRemindersList = (reminders || []).filter(r => r && r.contactoId === contactId);
    for (const r of contactRemindersList) {
      if (r.notificacionId) {
        await cancelReminderNotification(r.notificacionId);
      }
      await cancelReminderNotificationByReminderId(r.id);
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('contacto_id', contactId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting reminders for contact from Supabase:', error);
      }
    } catch (err) {
      console.error('Error in deleteRemindersForContact supabase:', err);
    }

    setReminders(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const updated = current.filter(r => r && r.contactoId !== contactId);
      persistLocalCache(user.id, updated);
      return updated;
    });
  }, [user?.id, reminders, persistLocalCache]);

  const getRemindersForContact = useCallback((contactId: string) => {
    return (reminders || [])
      .filter(r => r && r.contactoId === contactId)
      .sort((a, b) => {
        // Ordenar primero pendientes y luego completados, y por fecha
        if (a.completado !== b.completado) {
          return a.completado ? 1 : -1;
        }
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
      if (r.completado) return false; // Excluir completados de pendientes
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
    toggleCompleteReminder,
    deleteReminder,
    deleteRemindersForContact,
    isLoading,
    getRemindersForContact,
    getUpcomingReminders
  }), [
    reminders,
    addReminder,
    updateReminder,
    toggleCompleteReminder,
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
