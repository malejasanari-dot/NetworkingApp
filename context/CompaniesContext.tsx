import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Contact } from '../constants/MockData';

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
  isLoading: boolean;
}

const CompaniesContext = createContext<CompaniesContextData>({} as CompaniesContextData);

export const CompaniesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const storedCompanies = await AsyncStorage.getItem('@personal_networking_companies');
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      } else {
        setCompanies([]);
      }
    } catch (e) {
      console.error('Error loading companies:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addCompany = async (newCompanyData: Omit<Company, 'id'>): Promise<Company> => {
    try {
      // Evitar duplicados: validar por nombre
      const existingCompany = companies.find(
        c => c.name.trim().toLowerCase() === newCompanyData.name.trim().toLowerCase()
      );
      if (existingCompany) {
        return existingCompany;
      }

      const newCompany: Company = {
        ...newCompanyData,
        id: Date.now().toString(),
        contactIds: [],
      };
      
      const updatedCompanies = [newCompany, ...companies];
      setCompanies(updatedCompanies);
      await AsyncStorage.setItem('@personal_networking_companies', JSON.stringify(updatedCompanies));
      return newCompany;
    } catch (e) {
      console.error('Error saving company:', e);
      throw e;
    }
  };

  const updateCompany = async (id: string, updatedData: Partial<Company>) => {
    try {
      const updatedCompanies = companies.map(c => 
        c.id === id ? { ...c, ...updatedData } : c
      );
      setCompanies(updatedCompanies);
      await AsyncStorage.setItem('@personal_networking_companies', JSON.stringify(updatedCompanies));
    } catch (e) {
      console.error('Error updating company:', e);
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const updatedCompanies = companies.filter(c => c.id !== id);
      setCompanies(updatedCompanies);
      await AsyncStorage.setItem('@personal_networking_companies', JSON.stringify(updatedCompanies));
    } catch (e) {
      console.error('Error deleting company:', e);
    }
  };

  const syncCompanies = async (contacts: Contact[]) => {
    try {
      const currentCompanies = [...companies];
      let createdCount = 0;
      
      // Obtener nombres únicos de empresas de los contactos
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
          // Crear nueva empresa si no existe
          const newCompany: Company = {
            id: (Date.now() + createdCount).toString(),
            name: companyMaps.get(name.toLowerCase())?.[0] || name, // Usar el nombre original preservando mayúsculas/minúsculas de uno de los contactos
            sector: '',
            notes: '',
            contactIds: contactIds,
          };
          // Intentar encontrar un nombre con mejor capitalización si es posible
          const originalName = contacts.find(c => c.company?.toLowerCase() === name)?.company || name;
          newCompany.name = originalName.trim();
          
          updatedCompanies.push(newCompany);
          createdCount++;
        } else {
          // Actualizar contactos en empresa existente
          const existing = updatedCompanies[existingIndex];
          const newContactIds = Array.from(new Set([...(existing.contactIds || []), ...contactIds]));
          updatedCompanies[existingIndex] = { ...existing, contactIds: newContactIds };
        }
      }

      setCompanies(updatedCompanies);
      await AsyncStorage.setItem('@personal_networking_companies', JSON.stringify(updatedCompanies));
      return { created: createdCount };
    } catch (e) {
      console.error('Error syncing companies:', e);
      return { created: 0 };
    }
  };

  const syncContactCompanies = async (contactId: string, empresaActual: string | undefined, empresasAnteriores: string[] | undefined) => {
    try {
      let hasChanges = false;
      const updatedCompanies = companies.map(c => {
        let isLinked = false;
        if (empresaActual === c.id) isLinked = true;
        if (empresasAnteriores?.includes(c.id)) isLinked = true;

        const currentIds = c.contactIds || [];
        const hasId = currentIds.includes(contactId);

        if (isLinked && !hasId) {
          hasChanges = true;
          return { ...c, contactIds: [...currentIds, contactId] };
        } else if (!isLinked && hasId) {
          hasChanges = true;
          return { ...c, contactIds: currentIds.filter(id => id !== contactId) };
        }
        return c;
      });

      if (hasChanges) {
        setCompanies(updatedCompanies);
        await AsyncStorage.setItem('@personal_networking_companies', JSON.stringify(updatedCompanies));
      }
    } catch (e) {
      console.error('Error linking contact to companies:', e);
    }
  };

  return (
    <CompaniesContext.Provider value={{ companies, addCompany, updateCompany, deleteCompany, syncCompanies, syncContactCompanies, isLoading }}>
      {children}
    </CompaniesContext.Provider>
  );
};

export const useCompanies = () => useContext(CompaniesContext);
