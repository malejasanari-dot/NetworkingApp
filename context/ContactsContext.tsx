import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Contact, MOCK_CONTACTS } from '../constants/MockData';
import { generateId } from '../utils/id';
import { CONTACT_CATEGORIES } from '../constants/categories';
import { extractLinkedInUrl, isPureLinkedInNote } from '../utils/linkedin';

interface ContactsContextData {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'dateAdded'>) => Promise<Contact>;
  importContacts: (newContacts: Omit<Contact, 'id' | 'dateAdded'>[]) => Promise<{ imported: number, skipped: number }>;
  updateContact: (id: string, updatedData: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  isLoading: boolean;
}

const ContactsContext = createContext<ContactsContextData>({} as ContactsContextData);

const STORAGE_KEY = '@personal_networking_contacts';
const LEGACY_EXTRA_FIELDS_KEY = '@personal_networking_contacts_extra';
const USER_EXTRA_FIELDS_KEY = (userId: string) => `@personal_networking_contacts_extra_${userId}`;
const MIGRATION_FLAG_KEY = (userId: string) => `@contacts_migrated_to_supabase_${userId}`;
const LINKEDIN_MIGRATION_FLAG_KEY = (userId: string) => `@contacts_linkedin_migrated_${userId}`;

export interface ContactExtra {
  cargoRol?: string;
  directorioId?: string;
  linkedin?: string;
  syncedWithDb?: boolean;
}

let isCargoRolSupportedInDb = false;
let isDirectorioIdSupportedInDb = false;
let isLinkedinSupportedInDb = false;
let hasCheckedDbColumns = false;

const isColumnNotFoundError = (err: any): boolean => {
  if (!err) return false;
  if (err.code === '42703') return true;
  if (typeof err.message === 'string') {
    const msg = err.message.toLowerCase();
    return msg.includes('column') && msg.includes('does not exist');
  }
  return false;
};

export const checkDbColumnsSupport = async (forceRefresh = false): Promise<{ cargoRol: boolean; directorioId: boolean; linkedin: boolean }> => {
  if (hasCheckedDbColumns && !forceRefresh) {
    return { cargoRol: isCargoRolSupportedInDb, directorioId: isDirectorioIdSupportedInDb, linkedin: isLinkedinSupportedInDb };
  }

  let cargoCheckCompleted = false;
  let dirCheckCompleted = false;
  let liCheckCompleted = false;

  try {
    const { error: cargoError } = await supabase.from('contacts').select('cargo_rol').limit(1);
    if (!cargoError) {
      isCargoRolSupportedInDb = true;
      cargoCheckCompleted = true;
    } else if (isColumnNotFoundError(cargoError)) {
      isCargoRolSupportedInDb = false;
      cargoCheckCompleted = true;
    } else {
      // Error de red, timeout o sesión: no asumir que no existe
      console.warn('[checkDbColumnsSupport] Advertencia verificando cargo_rol:', cargoError.message);
    }
  } catch (err: any) {
    console.warn('[checkDbColumnsSupport] Excepción de red verificando cargo_rol:', err?.message);
  }

  try {
    const { error: dirError } = await supabase.from('contacts').select('directorio_id').limit(1);
    if (!dirError) {
      isDirectorioIdSupportedInDb = true;
      dirCheckCompleted = true;
    } else if (isColumnNotFoundError(dirError)) {
      isDirectorioIdSupportedInDb = false;
      dirCheckCompleted = true;
    } else {
      console.warn('[checkDbColumnsSupport] Advertencia verificando directorio_id:', dirError.message);
    }
  } catch (err: any) {
    console.warn('[checkDbColumnsSupport] Excepción de red verificando directorio_id:', err?.message);
  }

  try {
    const { error: liError } = await supabase.from('contacts').select('linkedin').limit(1);
    if (!liError) {
      isLinkedinSupportedInDb = true;
      liCheckCompleted = true;
    } else if (isColumnNotFoundError(liError)) {
      isLinkedinSupportedInDb = false;
      liCheckCompleted = true;
    } else {
      console.warn('[checkDbColumnsSupport] Advertencia verificando linkedin:', liError.message);
    }
  } catch (err: any) {
    console.warn('[checkDbColumnsSupport] Excepción de red verificando linkedin:', err?.message);
  }

  // Solo consideramos la verificación definitiva si todas las consultas obtuvieron respuesta concluyente
  if (cargoCheckCompleted && dirCheckCompleted && liCheckCompleted) {
    hasCheckedDbColumns = true;
  }

  return { cargoRol: isCargoRolSupportedInDb, directorioId: isDirectorioIdSupportedInDb, linkedin: isLinkedinSupportedInDb };
};

const getStoredExtraFields = async (userId?: string): Promise<Record<string, ContactExtra>> => {
  if (!userId) return {};
  try {
    const userKey = USER_EXTRA_FIELDS_KEY(userId);
    const rawUser = await AsyncStorage.getItem(userKey);
    let userExtras: Record<string, ContactExtra> = rawUser ? JSON.parse(rawUser) : {};

    // Migración no destructiva desde la clave legacy global si existe
    const rawLegacy = await AsyncStorage.getItem(LEGACY_EXTRA_FIELDS_KEY);
    if (rawLegacy) {
      try {
        const legacyExtras: Record<string, ContactExtra> = JSON.parse(rawLegacy);
        if (legacyExtras && typeof legacyExtras === 'object' && Object.keys(legacyExtras).length > 0) {
          userExtras = { ...legacyExtras, ...userExtras };
          await AsyncStorage.setItem(userKey, JSON.stringify(userExtras));
          await AsyncStorage.removeItem(LEGACY_EXTRA_FIELDS_KEY);
        }
      } catch (e) {
        console.error('Error migrando legacy extras:', e);
      }
    }

    return userExtras;
  } catch {
    return {};
  }
};

const saveStoredExtraFields = async (userId: string | undefined, extras: Record<string, ContactExtra>) => {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(USER_EXTRA_FIELDS_KEY(userId), JSON.stringify(extras));
  } catch {
    // Ignorar excepciones de cuota local
  }
};

const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

const isPureMockContact = (c: Contact): boolean => {
  if (!c || !c.id || !c.name) return false;
  return MOCK_CONTACTS.some(mock => 
    mock.id === c.id && 
    mock.name.trim().toLowerCase() === c.name.trim().toLowerCase() && 
    (mock.company || '').trim().toLowerCase() === (c.company || '').trim().toLowerCase() &&
    normalizePhone(mock.phone) === normalizePhone(c.phone)
  );
};

const mapRowToContact = (row: any, localExtras?: Record<string, any>): Contact => {
  const rawCategoria = row.categoria;
  const categoria = (CONTACT_CATEGORIES as readonly string[]).includes(rawCategoria) ? rawCategoria as Contact['categoria'] : undefined;
  const extra = localExtras?.[row.id] || {};

  return {
    id: row.id,
    name: row.name,
    company: row.company || undefined,
    cargoRol: row.cargo_rol || row.cargo || extra.cargoRol || undefined,
    empresaActual: row.empresa_actual || undefined,
    empresasAnteriores: Array.isArray(row.empresas_anteriores) ? row.empresas_anteriores : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    categoria,
    favorito: Boolean(row.favorito),
    notes: row.notes || undefined,
    phone: row.phone || undefined,
    dateAdded: row.date_added || new Date().toISOString(),
    directorioId: row.directorio_id || extra.directorioId || undefined,
    linkedin: row.linkedin || extra.linkedin || undefined,
  };
};

const mapContactToRow = (contact: Partial<Contact>, userId: string) => {
  const row: any = {
    user_id: userId,
  };
  if (contact.id !== undefined) row.id = contact.id;
  if (contact.name !== undefined) row.name = contact.name;
  if (contact.company !== undefined) row.company = contact.company || null;
  if (contact.empresaActual !== undefined) row.empresa_actual = contact.empresaActual || null;
  if (contact.empresasAnteriores !== undefined) row.empresas_anteriores = contact.empresasAnteriores || [];
  if (contact.tags !== undefined) row.tags = contact.tags || [];
  if (contact.favorito !== undefined) row.favorito = Boolean(contact.favorito);
  if (contact.notes !== undefined) row.notes = contact.notes || null;
  if (contact.phone !== undefined) row.phone = contact.phone || null;
  if (contact.categoria !== undefined) row.categoria = contact.categoria || null;
  if (contact.dateAdded !== undefined) row.date_added = contact.dateAdded;

  // Persistir en Supabase solo si la columna existe en el esquema remoto
  if (isCargoRolSupportedInDb && contact.cargoRol !== undefined) {
    row.cargo_rol = contact.cargoRol || null;
  }
  if (isDirectorioIdSupportedInDb && contact.directorioId !== undefined) {
    row.directorio_id = contact.directorioId || null;
  }
  if (isLinkedinSupportedInDb && contact.linkedin !== undefined) {
    row.linkedin = contact.linkedin || null;
  }

  return row;
};

const updateLocalReferencesForContactId = async (userId: string, oldId: string, newId: string) => {
  try {
    const notesStr = await AsyncStorage.getItem('@personal_networking_notes');
    if (notesStr) {
      const notes = JSON.parse(notesStr);
      if (Array.isArray(notes)) {
        let changed = false;
        const updatedNotes = notes.map((n: any) => {
          if (n && n.contactoId === oldId) {
            changed = true;
            return { ...n, contactoId: newId };
          }
          return n;
        });
        if (changed) {
          await AsyncStorage.setItem('@personal_networking_notes', JSON.stringify(updatedNotes));
        }
      }
    }

    const remindersStr = await AsyncStorage.getItem('@personal_networking_reminders');
    if (remindersStr) {
      const reminders = JSON.parse(remindersStr);
      if (Array.isArray(reminders)) {
        let changed = false;
        const updatedReminders = reminders.map((r: any) => {
          if (r && r.contactoId === oldId) {
            changed = true;
            return { ...r, contactoId: newId };
          }
          return r;
        });
        if (changed) {
          await AsyncStorage.setItem('@personal_networking_reminders', JSON.stringify(updatedReminders));
        }
      }
    }

    const { data: dbCompanies } = await supabase
      .from('companies')
      .select('id, contact_ids')
      .eq('user_id', userId);

    if (dbCompanies && Array.isArray(dbCompanies)) {
      for (const comp of dbCompanies) {
        if (Array.isArray(comp.contact_ids) && comp.contact_ids.includes(oldId)) {
          const updatedIds = comp.contact_ids.map((cid: string) => cid === oldId ? newId : cid);
          await supabase
            .from('companies')
            .update({ contact_ids: updatedIds })
            .eq('id', comp.id)
            .eq('user_id', userId);
        }
      }
    }
  } catch (e) {
    console.error('Error actualizando referencias locales tras remapeo de ID:', e);
  }
};

const migrateLocalContactsIfNeeded = async (userId: string, currentDbContacts: any[]) => {
  try {
    const isCompleted = await AsyncStorage.getItem(MIGRATION_FLAG_KEY(userId));
    if (isCompleted === 'true') {
      return currentDbContacts;
    }

    const storedStr = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedStr) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbContacts;
    }

    let localContacts: Contact[] = [];
    try {
      localContacts = JSON.parse(storedStr);
    } catch {
      return currentDbContacts;
    }

    if (!Array.isArray(localContacts) || localContacts.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbContacts;
    }

    const realLocalContacts = localContacts.filter(c => c && c.name && !isPureMockContact(c));

    if (realLocalContacts.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbContacts;
    }

    let allMigratedSuccessfully = true;
    const existingDbIds = new Set(currentDbContacts.map(c => c.id));
    const existingDbPhones = new Set(currentDbContacts.map(c => normalizePhone(c.phone)).filter(Boolean));
    const existingDbNames = new Set(currentDbContacts.map(c => c.name.trim().toLowerCase()));

    for (let i = 0; i < realLocalContacts.length; i++) {
      const contact = realLocalContacts[i];
      if (!contact || !contact.name) continue;

      const normPhone = normalizePhone(contact.phone);
      
      const isAlreadyInDbForUser = existingDbIds.has(contact.id) || 
        (normPhone && existingDbPhones.has(normPhone)) ||
        (existingDbNames.has(contact.name.trim().toLowerCase()) && (!normPhone || existingDbPhones.has(normPhone)));

      if (isAlreadyInDbForUser) {
        continue;
      }

      let targetId = contact.id;
      const { data: existingWithId } = await supabase
        .from('contacts')
        .select('id, user_id')
        .eq('id', targetId)
        .maybeSingle();

      if (existingWithId) {
        if (existingWithId.user_id === userId) {
          continue;
        } else {
          targetId = generateId(i);
          await updateLocalReferencesForContactId(userId, contact.id, targetId);
        }
      }

      const rowToInsert = mapContactToRow({ ...contact, id: targetId }, userId);
      const { error: insertError } = await supabase.from('contacts').insert(rowToInsert);

      if (insertError) {
        console.error(`Error migrando contacto ${contact.name}:`, insertError);
        allMigratedSuccessfully = false;
      } else {
        existingDbIds.add(targetId);
        if (normPhone) existingDbPhones.add(normPhone);
        existingDbNames.add(contact.name.trim().toLowerCase());
      }
    }

    if (allMigratedSuccessfully) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
    }

    const { data: updatedDbContacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: false });

    return updatedDbContacts || currentDbContacts;
  } catch (err) {
    console.error('Error durante la migración de contactos:', err);
    return currentDbContacts;
  }
};

const migrateNotesLinkedInIfNeeded = async (
  userId: string,
  currentContacts: Contact[],
  localExtras: Record<string, ContactExtra>
): Promise<Contact[]> => {
  try {
    const isCompleted = await AsyncStorage.getItem(LINKEDIN_MIGRATION_FLAG_KEY(userId));
    if (isCompleted === 'true') {
      return currentContacts;
    }

    // 1. Obtener notas de Supabase para este usuario
    let dbNotes: any[] = [];
    try {
      const { data } = await supabase
        .from('notes')
        .select('id, contacto_id, contenido')
        .eq('user_id', userId);
      if (data && Array.isArray(data)) dbNotes = data;
    } catch {}

    // 2. Obtener notas almacenadas localmente
    let localNotes: any[] = [];
    try {
      const storedNotesStr = await AsyncStorage.getItem('@personal_networking_notes');
      if (storedNotesStr) {
        const parsed = JSON.parse(storedNotesStr);
        if (Array.isArray(parsed)) localNotes = parsed;
      }
    } catch {}

    const allNotes = [
      ...dbNotes.map(n => ({ id: n.id, contactoId: n.contacto_id, contenido: n.contenido })),
      ...localNotes.map(n => ({ id: n.id, contactoId: n.contactoId, contenido: n.contenido })),
    ];

    let hasChanges = false;
    const notesToDeleteFromDb: string[] = [];
    const notesToDeleteLocalIds = new Set<string>();

    const updatedContacts = currentContacts.map(contact => {
      if (contact.linkedin) {
        return contact;
      }

      // Buscar en las notas asociadas al contacto
      const notesForThisContact = allNotes.filter(n => n.contactoId === contact.id);
      let foundUrl: string | null = null;
      let pureNoteId: string | null = null;

      for (const note of notesForThisContact) {
        const extracted = extractLinkedInUrl(note.contenido);
        if (extracted) {
          foundUrl = extracted;
          if (isPureLinkedInNote(note.contenido)) {
            pureNoteId = note.id;
          }
          break;
        }
      }

      // Si no se encontró en notas estructuradas, verificar si está en el campo legacy contact.notes
      if (!foundUrl && contact.notes) {
        const extractedFromLegacy = extractLinkedInUrl(contact.notes);
        if (extractedFromLegacy) {
          foundUrl = extractedFromLegacy;
          if (isPureLinkedInNote(contact.notes)) {
            contact.notes = undefined;
            hasChanges = true;
          }
        }
      }

      if (foundUrl) {
        hasChanges = true;
        contact.linkedin = foundUrl;

        localExtras[contact.id] = {
          ...localExtras[contact.id],
          linkedin: foundUrl,
          syncedWithDb: isLinkedinSupportedInDb,
        };

        if (pureNoteId) {
          notesToDeleteFromDb.push(pureNoteId);
          notesToDeleteLocalIds.add(pureNoteId);
        }
      }

      return contact;
    });

    if (hasChanges) {
      await saveStoredExtraFields(userId, localExtras);

      // Eliminar notas puras de LinkedIn en Supabase de forma segura
      if (notesToDeleteFromDb.length > 0) {
        try {
          await supabase
            .from('notes')
            .delete()
            .in('id', notesToDeleteFromDb)
            .eq('user_id', userId);
        } catch (e) {
          console.warn('[ContactsContext] Advertencia eliminando notas puras de LinkedIn en Supabase:', e);
        }
      }

      // Eliminar notas puras de LinkedIn en almacenamiento local
      if (notesToDeleteLocalIds.size > 0 && localNotes.length > 0) {
        try {
          const filteredLocal = localNotes.filter(n => !notesToDeleteLocalIds.has(n.id));
          await AsyncStorage.setItem('@personal_networking_notes', JSON.stringify(filteredLocal));
        } catch {}
      }
    }

    await AsyncStorage.setItem(LINKEDIN_MIGRATION_FLAG_KEY(userId), 'true');
    return updatedContacts;
  } catch (err) {
    console.warn('[ContactsContext] Error en migración de LinkedIn desde notas:', err);
    return currentContacts;
  }
};

export const ContactsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Resetear la caché de comprobación de columnas cuando cambia la sesión del usuario
  useEffect(() => {
    hasCheckedDbColumns = false;
  }, [user?.id]);

  const loadContacts = useCallback(async () => {
    if (!user?.id) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      await checkDbColumnsSupport();
      const localExtras = await getStoredExtraFields(user.id);

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching contacts from Supabase:', error);
        setIsLoading(false);
        return;
      }

      let finalRows = data || [];
      finalRows = await migrateLocalContactsIfNeeded(user.id, finalRows);

      let mappedContacts = finalRows.map(row => mapRowToContact(row, localExtras));
      mappedContacts = await migrateNotesLinkedInIfNeeded(user.id, mappedContacts, localExtras);

      setContacts(mappedContacts);

      // Sincronización segura en segundo plano hacia Supabase si las columnas están disponibles
      if (isCargoRolSupportedInDb || isDirectorioIdSupportedInDb || isLinkedinSupportedInDb) {
        let hasExtrasChanged = false;
        const syncTasks: Promise<void>[] = [];

        for (const row of finalRows) {
          const extra = localExtras[row.id];
          if (!extra) continue;

          // 1. Si Supabase ya tiene el dato en la columna remota, alinear localExtras y marcar como sincronizado
          if (row.cargo_rol || row.directorio_id || row.linkedin) {
            if (
              !extra.syncedWithDb ||
              (row.cargo_rol && extra.cargoRol !== row.cargo_rol) ||
              (row.directorio_id && extra.directorioId !== row.directorio_id) ||
              (row.linkedin && extra.linkedin !== row.linkedin)
            ) {
              if (row.cargo_rol) extra.cargoRol = row.cargo_rol;
              if (row.directorio_id) extra.directorioId = row.directorio_id;
              if (row.linkedin) extra.linkedin = row.linkedin;
              extra.syncedWithDb = true;
              hasExtrasChanged = true;
            }
            continue;
          }

          // 2. Si el dato ya fue sincronizado previamente y en Supabase está nulo,
          // significa que fue deliberadamente vaciado/eliminado. No resucitarlo.
          if (extra.syncedWithDb) {
            continue;
          }

          // 3. Preparar payload únicamente para campos pendientes
          const payload: any = {};
          if (isCargoRolSupportedInDb && !row.cargo_rol && extra.cargoRol) {
            payload.cargo_rol = extra.cargoRol;
          }
          if (isDirectorioIdSupportedInDb && !row.directorio_id && extra.directorioId) {
            payload.directorio_id = extra.directorioId;
          }
          if (isLinkedinSupportedInDb && !row.linkedin && extra.linkedin) {
            payload.linkedin = extra.linkedin;
          }

          if (Object.keys(payload).length > 0) {
            syncTasks.push(
              (async () => {
                const { error: updateErr } = await supabase
                  .from('contacts')
                  .update(payload)
                  .eq('id', row.id)
                  .eq('user_id', user.id);

                if (!updateErr) {
                  extra.syncedWithDb = true;
                  hasExtrasChanged = true;
                } else {
                  console.warn('[ContactsContext] Error sincronizando campos remotos para', row.id, updateErr.message);
                }
              })()
            );
          }
        }

        if (syncTasks.length > 0) {
          Promise.allSettled(syncTasks).then(async () => {
            if (hasExtrasChanged) {
              await saveStoredExtraFields(user.id, localExtras);
            }
          }).catch(() => {});
        } else if (hasExtrasChanged) {
          await saveStoredExtraFields(user.id, localExtras);
        }
      }
    } catch (err) {
      console.error('Error in loadContacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContacts();
  }, [loadContacts]);

  const addContact = useCallback(async (newContactData: Omit<Contact, 'id' | 'dateAdded'>): Promise<Contact> => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    await checkDbColumnsSupport();

    const newContact: Contact = {
      ...newContactData,
      id: generateId(),
      dateAdded: new Date().toISOString(),
    };

    const row = mapContactToRow(newContact, user.id);
    const { data, error } = await supabase
      .from('contacts')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting contact in Supabase:', error);
      throw error;
    }

    // Persistir en caché local aislada por usuario
    if (newContact.cargoRol || newContact.directorioId || newContact.linkedin) {
      const extras = await getStoredExtraFields(user.id);
      extras[newContact.id] = {
        cargoRol: newContact.cargoRol,
        directorioId: newContact.directorioId,
        linkedin: newContact.linkedin,
        syncedWithDb: isCargoRolSupportedInDb && isDirectorioIdSupportedInDb && isLinkedinSupportedInDb,
      };
      await saveStoredExtraFields(user.id, extras);
    }

    const localExtras = await getStoredExtraFields(user.id);
    const insertedContact = data ? mapRowToContact(data, localExtras) : newContact;

    setContacts(prev => [insertedContact, ...(Array.isArray(prev) ? prev : [])]);

    return insertedContact;
  }, [user]);

  const importContacts = useCallback(async (newContactsData: Omit<Contact, 'id' | 'dateAdded'>[]) => {
    if (!user?.id) {
      return { imported: 0, skipped: 0 };
    }

    await checkDbColumnsSupport();
    const now = new Date().toISOString();
    let importedCount = 0;
    let skippedCount = 0;
    const newInsertedContacts: Contact[] = [];
    const extras = await getStoredExtraFields(user.id);

    for (let index = 0; index < newContactsData.length; index++) {
      const data = newContactsData[index];
      const normDataPhone = normalizePhone(data.phone);

      const isDuplicate = contacts.some(c => {
        const sameName = c.name.trim().toLowerCase() === data.name.trim().toLowerCase();
        const normCPhone = normalizePhone(c.phone);
        const samePhone = normDataPhone.length > 0 && normCPhone === normDataPhone;
        return sameName || samePhone;
      });

      if (!isDuplicate) {
        const newContact: Contact = {
          ...data,
          id: generateId(index),
          dateAdded: now,
        };

        const row = mapContactToRow(newContact, user.id);
        const { data: insertedData, error } = await supabase
          .from('contacts')
          .insert(row)
          .select()
          .single();

        if (!error) {
          if (newContact.cargoRol || newContact.directorioId || newContact.linkedin) {
            extras[newContact.id] = {
              cargoRol: newContact.cargoRol,
              directorioId: newContact.directorioId,
              linkedin: newContact.linkedin,
              syncedWithDb: isCargoRolSupportedInDb && isDirectorioIdSupportedInDb && isLinkedinSupportedInDb,
            };
          }
          newInsertedContacts.unshift(insertedData ? mapRowToContact(insertedData, extras) : newContact);
          importedCount++;
        } else {
          console.error('Error importing contact item:', error);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    if (Object.keys(extras).length > 0) {
      await saveStoredExtraFields(user.id, extras);
    }

    if (newInsertedContacts.length > 0) {
      setContacts(prev => [...newInsertedContacts, ...(Array.isArray(prev) ? prev : [])]);
    }

    return { imported: importedCount, skipped: skippedCount };
  }, [user, contacts]);

  const updateContact = useCallback(async (id: string, updatedData: Partial<Contact>) => {
    if (!user?.id) return;

    await checkDbColumnsSupport();

    // Protección de categoría para contactos originados en el Directorio LHH:
    // La categoría "Directorio LHH" no puede ser alterada ni eliminada.
    const targetContact = contacts.find(c => c.id === id);
    const isFromDirectory = Boolean(
      targetContact?.directorioId ||
      updatedData.directorioId ||
      (targetContact?.tags && targetContact.tags.some(t => typeof t === 'string' && t.toLowerCase().startsWith('directorio_id:')))
    );

    const safeUpdatedData = { ...updatedData };
    if (isFromDirectory) {
      safeUpdatedData.categoria = 'Directorio LHH';
    }

    if (
      safeUpdatedData.cargoRol !== undefined ||
      safeUpdatedData.directorioId !== undefined ||
      safeUpdatedData.linkedin !== undefined
    ) {
      const extras = await getStoredExtraFields(user.id);
      extras[id] = {
        ...extras[id],
        ...(safeUpdatedData.cargoRol !== undefined ? { cargoRol: safeUpdatedData.cargoRol || undefined } : {}),
        ...(safeUpdatedData.directorioId !== undefined ? { directorioId: safeUpdatedData.directorioId || undefined } : {}),
        ...(safeUpdatedData.linkedin !== undefined ? { linkedin: safeUpdatedData.linkedin || undefined } : {}),
        syncedWithDb: isCargoRolSupportedInDb && isDirectorioIdSupportedInDb && isLinkedinSupportedInDb,
      };
      await saveStoredExtraFields(user.id, extras);
    }

    const rowUpdate = mapContactToRow(safeUpdatedData, user.id);
    delete rowUpdate.id;

    const { error } = await supabase
      .from('contacts')
      .update(rowUpdate)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating contact in Supabase:', error);
      throw error;
    }

    setContacts(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(c => (c && c.id === id ? { ...c, ...safeUpdatedData } : c));
    });
  }, [user, contacts]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user?.id) return;

    const extras = await getStoredExtraFields(user.id);
    if (extras[id]) {
      delete extras[id];
      await saveStoredExtraFields(user.id, extras);
    }

    // Limpieza de referencias en contact_ids de empresas en Supabase
    try {
      const { data: dbCompanies } = await supabase
        .from('companies')
        .select('id, contact_ids')
        .eq('user_id', user.id);

      if (dbCompanies && Array.isArray(dbCompanies)) {
        for (const comp of dbCompanies) {
          if (Array.isArray(comp.contact_ids) && comp.contact_ids.includes(id)) {
            const updatedIds = comp.contact_ids.filter((cid: string) => cid !== id);
            await supabase
              .from('companies')
              .update({ contact_ids: updatedIds })
              .eq('id', comp.id)
              .eq('user_id', user.id);
          }
        }
      }
    } catch (e) {
      console.error('Error limpiando id de contacto en empresas al eliminar:', e);
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting contact from Supabase:', error);
      throw error;
    }

    setContacts(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.filter(c => c && c.id !== id);
    });
  }, [user]);

  const refreshContacts = useCallback(async () => {
    await checkDbColumnsSupport(true);
    await loadContacts();
  }, [loadContacts]);

  const value = useMemo(() => ({
    contacts,
    addContact,
    importContacts,
    updateContact,
    deleteContact,
    refreshContacts,
    isLoading,
  }), [contacts, addContact, importContacts, updateContact, deleteContact, refreshContacts, isLoading]);

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => useContext(ContactsContext);
