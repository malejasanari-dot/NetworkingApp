export interface Contact {
  id: string;
  name: string;
  company?: string;
  empresaActual?: string;
  empresasAnteriores?: string[];
  tags: string[];
  favorito: boolean;
  notes?: string;
  phone?: string;
  dateAdded: string;
}

export interface Recordatorio {
  id: string;
  contactoId: string;
  fecha: string; // ISO String
  nota: string;
}

export interface Nota {
  id: string;
  contactoId: string;
  contenido: string;
  fecha: string; // ISO String
}

export const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Laura Gómez',
    company: 'Tech Innovations SL',
    tags: ['Trabajo', 'Diseño'],
    favorito: true,
    notes: 'Conocida en la conferencia de UX en Madrid.',
    phone: '+34 600 123 456',
    dateAdded: '2026-04-05T10:00:00Z',
  },
  {
    id: '2',
    name: 'Carlos Mendoza',
    company: 'Fintech Solutions',
    tags: ['Inversor', 'Evento'],
    favorito: false,
    notes: 'Hablamos sobre oportunidades de inversión semilla.',
    phone: '+34 611 222 333',
    dateAdded: '2026-04-04T14:30:00Z',
  },
  {
    id: '3',
    name: 'Ana Silva',
    company: 'Agencia Creativa',
    tags: ['Amigos', 'Marketing'],
    favorito: true,
    notes: 'Posible colaboración corporativa.',
    phone: '+34 622 333 444',
    dateAdded: '2026-03-20T09:15:00Z',
  },
  {
    id: '4',
    name: 'David Ortiz',
    company: 'Freelance',
    tags: ['Desarrollo', 'Mentoría'],
    favorito: false,
    notes: 'Experto en React Native y Node.js',
    phone: '+34 633 444 555',
    dateAdded: '2026-04-06T08:00:00Z',
  },
  {
    id: '5',
    name: 'Elena Rodríguez',
    company: 'StartUp Hub',
    tags: ['Networking', 'Evento'],
    favorito: true,
    notes: 'Organizadora de eventos de networking en la ciudad.',
    phone: '+34 644 555 666',
    dateAdded: '2026-04-02T16:45:00Z',
  },
];

export const MOCK_PROFILE = {
  name: 'María Ariza',
  title: 'Senior Product Manager',
  company: 'Global Enterprises',
  totalContacts: 142,
  favorites: 24,
  tags: 15,
};
