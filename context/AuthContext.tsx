import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getBaseApiUrl } from '../services/directoryApi';

import { decodeBase64ToArrayBuffer } from '../utils/base64';

const getAuthMetadataName = (currentUser: User): string => {
  const meta = currentUser.user_metadata;
  const rawName = (meta?.name || meta?.full_name || '') as string;
  return typeof rawName === 'string' ? rawName.trim() : '';
};

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  title?: string;
  company?: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    options?: { onCandidateFound?: () => void }
  ) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  uploadAvatar: (base64OrArrayBuffer: string | ArrayBuffer) => Promise<{ avatarUrl: string | null; error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Registro de perfil no existe todavía, crear con datos reales base (sin valores mock)
        const initialProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          name: getAuthMetadataName(currentUser),
          title: '',
          company: '',
          avatar_url: null,
        };
        const { data: createdData, error: insertError } = await supabase
          .from('profiles')
          .insert(initialProfile)
          .select()
          .single();

        if (!insertError && createdData) {
          setProfile(createdData);
          return;
        }
      }

      if (data) {
        setProfile(data);
      } else {
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          name: getAuthMetadataName(currentUser),
          title: '',
          company: '',
          avatar_url: null,
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        name: getAuthMetadataName(currentUser),
        title: '',
        company: '',
        avatar_url: null,
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Obtener la sesión inicial al cargar el provider
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Suscribirse a cambios en el estado de autenticación (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (
    email: string,
    password: string,
    options?: { onCandidateFound?: () => void }
  ) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      // 1. Intentar primero el inicio de sesión directo en Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user) {
          await fetchProfile(data.user);
        }
        return { error: null };
      }

      // 2. Si falla por credenciales no registradas, validar candidato en MySQL y crear cuenta si aún no existe
      const baseUrl = getBaseApiUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let activatePayload: any = null;
      try {
        const response = await fetch(`${baseUrl}/api/auth/activate-candidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            cedula: normalizedPassword,
          }),
          signal: controller.signal,
        });

        activatePayload = await response.json().catch(() => null);

        if (!response.ok || !activatePayload?.success || !activatePayload?.authorized) {
          return { error: error || new Error('Correo o contraseña incorrectos.') };
        }
      } catch {
        // Si el backend no responde o falla la red, devolver el error de autenticación original
        return { error: error || new Error('Error de conexión') };
      } finally {
        clearTimeout(timeoutId);
      }

      // Si el usuario ya existía en Supabase Auth y falló signInWithPassword en el paso 1,
      // no se creó otra cuenta y las credenciales de Supabase son inválidas.
      if (activatePayload.alreadyExists && !activatePayload.created) {
        return { error: error || new Error('Correo o contraseña incorrectos.') };
      }

      // 3. Candidato validado en MySQL y usuario creado en Supabase Auth:
      // notificar brevemente «Usuario encontrado» y continuar automáticamente con signInWithPassword
      options?.onCandidateFound?.();

      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (retryError || !retryData?.session) {
        return { error: retryError || new Error('No se pudo iniciar sesión automáticamente.') };
      }

      if (retryData.user) {
        try {
          await AsyncStorage.setItem(`@contacts_migrated_to_supabase_${retryData.user.id}`, 'true');
          await AsyncStorage.setItem(`@reminders_migrated_to_supabase_${retryData.user.id}`, 'true');
        } catch {
          // Ignorar errores de almacenamiento local
        }
      }
      setSession(retryData.session);
      setUser(retryData.user);
      if (retryData.user) {
        await fetchProfile(retryData.user);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err || new Error('Error de conexión') };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const uploadAvatar = async (base64OrArrayBuffer: string | ArrayBuffer): Promise<{ avatarUrl: string | null; error: Error | null }> => {
    if (!user) {
      return { avatarUrl: null, error: new Error('Usuario no autenticado') };
    }
    try {
      let arrayBuffer: ArrayBuffer;
      if (typeof base64OrArrayBuffer === 'string') {
        arrayBuffer = decodeBase64ToArrayBuffer(base64OrArrayBuffer);
      } else {
        arrayBuffer = base64OrArrayBuffer;
      }

      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error al subir avatar a Supabase Storage:', uploadError);
        return { avatarUrl: null, error: uploadError };
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrlWithCacheBust = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      return { avatarUrl: avatarUrlWithCacheBust, error: null };
    } catch (err: any) {
      console.error('Excepción en uploadAvatar:', err);
      return { avatarUrl: null, error: err || new Error('Error al procesar y subir el avatar') };
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('Usuario no autenticado') };
    }
    try {
      const payload = {
        id: user.id,
        email: user.email || '',
        name: data.name !== undefined ? data.name : (profile?.name || ''),
        title: data.title !== undefined ? data.title : (profile?.title || ''),
        company: data.company !== undefined ? data.company : (profile?.company || ''),
        avatar_url: data.avatar_url !== undefined ? data.avatar_url : (profile?.avatar_url || null),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedData, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        return { error };
      }

      if (updatedData) {
        setProfile(updatedData);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err || new Error('Error al actualizar el perfil') };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, login, logout, updateProfile, uploadAvatar, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
