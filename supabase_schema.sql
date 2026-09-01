-- ==============================================================================
-- NETWORKINGAPP 2.0 - ESQUEMA DEFINITIVO DE BASE DE DATOS Y RLS (D-007)
-- Compatible 1:1 con los modelos actuales: Contact, Company, Nota, Recordatorio y Profile
-- Ajuste de Seguridad: Verificación estricta de propiedad de contacto en Notes y Reminders
-- ==============================================================================

-- 1. TABLA: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  title TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  empresa_actual TEXT,
  empresas_anteriores TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  favorito BOOLEAN DEFAULT FALSE,
  notes TEXT,
  phone TEXT,
  categoria TEXT DEFAULT NULL,
  date_added TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT,
  notes TEXT,
  contact_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: NOTES
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contacto_id TEXT NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: REMINDERS
CREATE TABLE IF NOT EXISTS public.reminders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contacto_id TEXT NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL,
  nota TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFIL AL REGISTRAR UN USUARIO EN AUTH
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS RLS CON ROL AUTHENTICATED Y COMPROBACIÓN DE PROPIEDAD
-- ==============================================================================

-- PROFILES
DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Profiles insert own" ON public.profiles;
CREATE POLICY "Profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Profiles delete own" ON public.profiles;
CREATE POLICY "Profiles delete own" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- CONTACTS
DROP POLICY IF EXISTS "Contacts select own" ON public.contacts;
CREATE POLICY "Contacts select own" ON public.contacts FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Contacts insert own" ON public.contacts;
CREATE POLICY "Contacts insert own" ON public.contacts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Contacts update own" ON public.contacts;
CREATE POLICY "Contacts update own" ON public.contacts FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Contacts delete own" ON public.contacts;
CREATE POLICY "Contacts delete own" ON public.contacts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- COMPANIES
DROP POLICY IF EXISTS "Companies select own" ON public.companies;
CREATE POLICY "Companies select own" ON public.companies FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Companies insert own" ON public.companies;
CREATE POLICY "Companies insert own" ON public.companies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Companies update own" ON public.companies;
CREATE POLICY "Companies update own" ON public.companies FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Companies delete own" ON public.companies;
CREATE POLICY "Companies delete own" ON public.companies FOR DELETE TO authenticated USING (user_id = auth.uid());

-- NOTES (Verificación dual: user_id = auth.uid() Y contacto_id pertenece al usuario)
DROP POLICY IF EXISTS "Notes select own" ON public.notes;
CREATE POLICY "Notes select own" ON public.notes FOR SELECT TO authenticated USING (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = notes.contacto_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Notes insert own" ON public.notes;
CREATE POLICY "Notes insert own" ON public.notes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = notes.contacto_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Notes update own" ON public.notes;
CREATE POLICY "Notes update own" ON public.notes FOR UPDATE TO authenticated USING (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = notes.contacto_id AND c.user_id = auth.uid())
) WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = notes.contacto_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Notes delete own" ON public.notes;
CREATE POLICY "Notes delete own" ON public.notes FOR DELETE TO authenticated USING (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = notes.contacto_id AND c.user_id = auth.uid())
);

-- REMINDERS (Verificación dual: user_id = auth.uid() Y contacto_id pertenece al usuario)
DROP POLICY IF EXISTS "Reminders select own" ON public.reminders;
CREATE POLICY "Reminders select own" ON public.reminders FOR SELECT TO authenticated USING (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = reminders.contacto_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Reminders insert own" ON public.reminders;
CREATE POLICY "Reminders insert own" ON public.reminders FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = reminders.contacto_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Reminders update own" ON public.reminders;
CREATE POLICY "Reminders update own" ON public.reminders FOR UPDATE TO authenticated USING (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = reminders.contacto_id AND c.user_id = auth.uid())
) WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = reminders.contacto_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Reminders delete own" ON public.reminders;
CREATE POLICY "Reminders delete own" ON public.reminders FOR DELETE TO authenticated USING (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = reminders.contacto_id AND c.user_id = auth.uid())
);

-- ==============================================================================
-- ÍNDICES PARA BÚSQUEDAS EFICIENTES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_contacto_id ON public.notes(contacto_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_contacto_id ON public.reminders(contacto_id);

-- ==============================================================================
-- STORAGE: BUCKET AVATARS Y POLÍTICAS DE ACCESO
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública de avatares
DROP POLICY IF EXISTS "Avatars public select" ON storage.objects;
CREATE POLICY "Avatars public select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Subida y reemplazo exclusivo por el usuario autenticado en su carpeta
DROP POLICY IF EXISTS "Avatars user insert" ON storage.objects;
CREATE POLICY "Avatars user insert" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars user update" ON storage.objects;
CREATE POLICY "Avatars user update" ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

