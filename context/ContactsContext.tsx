import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Contact, MOCK_CONTACTS } from '../constants/MockData';
import { generateId } from '../utils/id';
import { CONTACT_CATEGORIES } from '../constants/categories';

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
const MIGRATION_FLAG_KEY = (userId: string) => `@contacts_migrated_to_supabase_${userId}`;

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

const mapRowToContact = (row: any): Contact => {
  const rawCategoria = row.categoria;
  const categoria = (CONTACT_CATEGORIES as readonly string[]).includes(rawCategoria) ? rawCategoria as Contact['categoria'] : undefined;
  return {
    id: row.id,
    name: row.name,
    company: row.company || undefined,
    empresaActual: row.empresa_actual || undefined,
    empresasAnteriores: Array.isArray(row.empresas_anteriores) ? row.empresas_anteriores : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    categoria,
    favorito: Boolean(row.favorito),
    notes: row.notes || undefined,
    phone: row.phone || undefined,
    dateAdded: row.date_added || new Date().toISOString(),
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

export const ContactsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadContacts = useCallback(async () => {
    if (!user?.id) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
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

      setContacts(finalRows.map(mapRowToContact));
    } catch (err) {
      console.error('Error in loadContacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const addContact = useCallback(async (newContactData: Omit<Contact, 'id' | 'dateAdded'>): Promise<Contact> => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

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

    const insertedContact = data ? mapRowToContact(data) : newContact;

    setContacts(prev => [insertedContact, ...(Array.isArray(prev) ? prev : [])]);

    return insertedContact;
  }, [user?.id]);

  const importContacts = useCallback(async (newContactsData: Omit<Contact, 'id' | 'dateAdded'>[]) => {
    if (!user?.id) {
      return { imported: 0, skipped: 0 };
    }

    const now = new Date().toISOString();
    let importedCount = 0;
    let skippedCount = 0;
    const newInsertedContacts: Contact[] = [];

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
          newInsertedContacts.unshift(insertedData ? mapRowToContact(insertedData) : newContact);
          importedCount++;
        } else {
          console.error('Error importing contact item:', error);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    if (newInsertedContacts.length > 0) {
      setContacts(prev => [...newInsertedContacts, ...(Array.isArray(prev) ? prev : [])]);
    }

    return { imported: importedCount, skipped: skippedCount };
  }, [user?.id, contacts]);

  const updateContact = useCallback(async (id: string, updatedData: Partial<Contact>) => {
    if (!user?.id) return;

    const rowUpdate = mapContactToRow(updatedData, user.id);
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
      return current.map(c => (c && c.id === id ? { ...c, ...updatedData } : c));
    });
  }, [user?.id]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user?.id) return;

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
  }, [user?.id]);

  const refreshContacts = useCallback(async () => {
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
