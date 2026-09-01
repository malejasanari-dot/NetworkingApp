import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Contact } from '../constants/MockData';
import { generateId } from '../utils/id';

export interface Company {
  id: string;
  name: string;
  sector?: string;
  notes?: string;
  contactIds?: string[];
}

interface CompaniesContextData {
  companies: Company[];
  addCompany: (company: Omit<Company, 'id'>) => Promise<Company>;
  updateCompany: (id: string, updatedData: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  syncCompanies: (contacts: Contact[]) => Promise<{ created: number }>;
  syncContactCompanies: (contactId: string, empresaActual: string | undefined, empresasAnteriores: string[] | undefined) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  isLoading: boolean;
}

const CompaniesContext = createContext<CompaniesContextData>({} as CompaniesContextData);

const STORAGE_KEY = '@personal_networking_companies';
const MIGRATION_FLAG_KEY = (userId: string) => `@companies_migrated_to_supabase_${userId}`;

const mapRowToCompany = (row: any): Company => ({
  id: row.id,
  name: row.name,
  sector: row.sector || undefined,
  notes: row.notes || undefined,
  contactIds: Array.isArray(row.contact_ids) ? row.contact_ids : [],
});

const mapCompanyToRow = (company: Partial<Company>, userId: string) => {
  const row: any = {
    user_id: userId,
  };
  if (company.id !== undefined) row.id = company.id;
  if (company.name !== undefined) row.name = company.name;
  if (company.sector !== undefined) row.sector = company.sector || null;
  if (company.notes !== undefined) row.notes = company.notes || null;
  if (company.contactIds !== undefined) row.contact_ids = company.contactIds || [];
  return row;
};

const migrateLocalCompaniesIfNeeded = async (userId: string, currentDbCompanies: any[]) => {
  try {
    const isCompleted = await AsyncStorage.getItem(MIGRATION_FLAG_KEY(userId));
    if (isCompleted === 'true') {
      return currentDbCompanies;
    }

    const storedStr = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedStr) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbCompanies;
    }

    let localCompanies: Company[] = [];
    try {
      localCompanies = JSON.parse(storedStr);
    } catch {
      return currentDbCompanies;
    }

    if (!Array.isArray(localCompanies) || localCompanies.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbCompanies;
    }

    let allMigratedSuccessfully = true;
    const existingDbIds = new Set(currentDbCompanies.map(c => c.id));
    const existingDbNames = new Set(currentDbCompanies.map(c => c.name.trim().toLowerCase()));

    for (let i = 0; i < localCompanies.length; i++) {
      const company = localCompanies[i];
      if (!company || !company.name) continue;

      const isAlreadyInDb = existingDbIds.has(company.id) ||
        existingDbNames.has(company.name.trim().toLowerCase());

      if (isAlreadyInDb) {
        continue;
      }

      let targetId = company.id;
      const { data: existingWithId } = await supabase
        .from('companies')
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

      const rowToInsert = mapCompanyToRow({ ...company, id: targetId }, userId);
      const { error: insertError } = await supabase.from('companies').insert(rowToInsert);

      if (insertError) {
        console.error(`Error migrando empresa ${company.name}:`, insertError);
        allMigratedSuccessfully = false;
      } else {
        existingDbIds.add(targetId);
      }
    }

    if (allMigratedSuccessfully) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
    }

    const { data: updatedDbCompanies } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return updatedDbCompanies || currentDbCompanies;
  } catch (err) {
    console.error('Error durante la migración de empresas:', err);
    return currentDbCompanies;
  }
};

export const CompaniesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadCompanies = useCallback(async () => {
    if (!user?.id) {
      setCompanies([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies from Supabase:', error);
        setIsLoading(false);
        return;
      }

      let finalRows = data || [];
      finalRows = await migrateLocalCompaniesIfNeeded(user.id, finalRows);

      setCompanies(finalRows.map(mapRowToCompany));
    } catch (err) {
      console.error('Error in loadCompanies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const addCompany = useCallback(async (newCompanyData: Omit<Company, 'id'>): Promise<Company> => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    const existingCompany = companies.find(
      c => c.name.trim().toLowerCase() === newCompanyData.name.trim().toLowerCase()
    );
    if (existingCompany) {
      return existingCompany;
    }

    const newCompany: Company = {
      ...newCompanyData,
      id: generateId(),
      contactIds: newCompanyData.contactIds || [],
    };

    const row = mapCompanyToRow(newCompany, user.id);
    const { data, error } = await supabase
      .from('companies')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting company in Supabase:', error);
      throw error;
    }

    const insertedCompany = data ? mapRowToCompany(data) : newCompany;

    setCompanies(prev => [insertedCompany, ...(Array.isArray(prev) ? prev : [])]);

    return insertedCompany;
  }, [user?.id, companies]);

  const updateCompany = useCallback(async (id: string, updatedData: Partial<Company>) => {
    if (!user?.id) return;

    if (updatedData.name) {
      const nameLower = updatedData.name.trim().toLowerCase();
      const existingCompany = companies.find(
        c => c.id !== id && c.name.trim().toLowerCase() === nameLower
      );
      if (existingCompany) {
        throw new Error('Ya existe una empresa registrada con este nombre.');
      }
    }

    const rowUpdate = mapCompanyToRow(updatedData, user.id);
    delete rowUpdate.id;

    const { error } = await supabase
      .from('companies')
      .update(rowUpdate)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating company in Supabase:', error);
      throw error;
    }

    setCompanies(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(c => (c && c.id === id ? { ...c, ...updatedData } : c));
    });
  }, [user?.id, companies]);

  const deleteCompany = useCallback(async (id: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting company from Supabase:', error);
      throw error;
    }

    setCompanies(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.filter(c => c && c.id !== id);
    });
  }, [user?.id]);

  const syncCompanies = useCallback(async (contacts: Contact[]) => {
    if (!user?.id) return { created: 0 };

    try {
      const currentCompanies = [...companies];
      let createdCount = 0;

      const companyMaps = new Map<string, string[]>();

      contacts.forEach(contact => {
        if (contact.company && contact.company.trim()) {
          const normalizedName = contact.company.trim();
          const key = normalizedName.toLowerCase();
          if (!companyMaps.has(key)) {
            companyMaps.set(key, []);
          }
          companyMaps.get(key)?.push(contact.id);
        }
      });

      const updatedCompanies = [...currentCompanies];

      for (const [name, contactIds] of companyMaps.entries()) {
        const existingIndex = updatedCompanies.findIndex(c => c.name.toLowerCase() === name);

        if (existingIndex === -1) {
          const originalName = contacts.find(c => c.company?.toLowerCase() === name)?.company || name;
          const newCompany: Company = {
            id: generateId(createdCount),
            name: originalName.trim(),
            sector: '',
            notes: '',
            contactIds: contactIds,
          };

          const row = mapCompanyToRow(newCompany, user.id);
          const { data: insertedData, error } = await supabase
            .from('companies')
            .insert(row)
            .select()
            .single();

          if (!error) {
            updatedCompanies.push(insertedData ? mapRowToCompany(insertedData) : newCompany);
            createdCount++;
          }
        } else {
          const existing = updatedCompanies[existingIndex];
          const newContactIds = Array.from(new Set([...(existing.contactIds || []), ...contactIds]));

          const { error } = await supabase
            .from('companies')
            .update({ contact_ids: newContactIds })
            .eq('id', existing.id)
            .eq('user_id', user.id);

          if (!error) {
            updatedCompanies[existingIndex] = { ...existing, contactIds: newContactIds };
          }
        }
      }

      setCompanies(updatedCompanies);
      return { created: createdCount };
    } catch (e) {
      console.error('Error syncing companies in Supabase:', e);
      return { created: 0 };
    }
  }, [user?.id, companies]);

  const syncContactCompanies = useCallback(async (contactId: string, empresaActual: string | undefined, empresasAnteriores: string[] | undefined) => {
    if (!user?.id) return;

    try {
      let hasChanges = false;
      const companiesToUpdate: { id: string; contactIds: string[] }[] = [];

      const updatedCompanies = companies.map(c => {
        let isLinked = false;
        if (empresaActual === c.id) isLinked = true;
        if (empresasAnteriores?.includes(c.id)) isLinked = true;

        const currentIds = c.contactIds || [];
        const hasId = currentIds.includes(contactId);

        if (isLinked && !hasId) {
          hasChanges = true;
          const newIds = [...currentIds, contactId];
          companiesToUpdate.push({ id: c.id, contactIds: newIds });
          return { ...c, contactIds: newIds };
        } else if (!isLinked && hasId) {
          hasChanges = true;
          const newIds = currentIds.filter(id => id !== contactId);
          companiesToUpdate.push({ id: c.id, contactIds: newIds });
          return { ...c, contactIds: newIds };
        }
        return c;
      });

      if (hasChanges) {
        for (const item of companiesToUpdate) {
          await supabase
            .from('companies')
            .update({ contact_ids: item.contactIds })
            .eq('id', item.id)
            .eq('user_id', user.id);
        }
        setCompanies(updatedCompanies);
      }
    } catch (e) {
      console.error('Error linking contact to companies in Supabase:', e);
    }
  }, [user?.id, companies]);

  const refreshCompanies = useCallback(async () => {
    await loadCompanies();
  }, [loadCompanies]);

  const value = useMemo(() => ({
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    syncCompanies,
    syncContactCompanies,
    refreshCompanies,
    isLoading,
  }), [companies, addCompany, updateCompany, deleteCompany, syncCompanies, syncContactCompanies, refreshCompanies, isLoading]);

  return (
    <CompaniesContext.Provider value={value}>
      {children}
    </CompaniesContext.Provider>
  );
};

export const useCompanies = () => useContext(CompaniesContext);
