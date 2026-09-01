export type OwnerItemStatus = 'Active' | 'Pending' | 'Sold' | 'Rented';

export type OwnerItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  discountPrice?: number;
  saleType?: 'Sell' | 'Rent';
  specialLocation?: string;
  featured?: boolean;
  premium?: boolean;
  paymentMethod?: string;
  paymentDetails?: string;
  status: OwnerItemStatus;
  location?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
};

export type OwnerMessage = {
  id: string;
  sender: 'owner' | 'customer';
  text: string;
  timestamp: string;
};

export type OwnerConversation = {
  id: string;
  customerName: string;
  customerEmail: string;
  itemTitle: string;
  updatedAt: string;
  messages: OwnerMessage[];
};

export type OwnerProfile = {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
  bio: string;
  avatarUrl?: string;
};

export type OwnerSecurityState = {
  password: string;
};

const OWNER_ITEMS_KEY = 'owner_dashboard_items';
const OWNER_CONVERSATIONS_KEY = 'owner_dashboard_conversations';
const OWNER_PROFILE_KEY = 'owner_dashboard_profile';
const OWNER_SECURITY_KEY = 'owner_dashboard_security';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const safeParse = <T>(value: string | null, fallback: T) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const saveLocalStorageItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Failed to write localStorage item', key, error);
    return false;
  }
};

export const loadOwnerItems = (): OwnerItem[] =>
  safeParse<OwnerItem[]>(localStorage.getItem(OWNER_ITEMS_KEY), []);

export const saveOwnerItems = (items: OwnerItem[]) =>
  localStorage.setItem(OWNER_ITEMS_KEY, JSON.stringify(items));

export const loadOwnerConversations = (): OwnerConversation[] => {
  const stored = safeParse<OwnerConversation[]>(localStorage.getItem(OWNER_CONVERSATIONS_KEY), []);
  if (stored.length === 0) {
    const initial: OwnerConversation[] = [
      {
        id: createId(),
        customerName: 'Samuel Z.',
        customerEmail: 'samuel@example.com',
        itemTitle: 'Conference projector rental',
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: createId(),
            sender: 'customer',
            text: 'Hi, is the projector still available for next Friday?',
            timestamp: new Date(new Date().getTime() - 1000 * 60 * 50).toISOString(),
          },
          {
            id: createId(),
            sender: 'owner',
            text: 'Yes, it is available. You can reserve it today.',
            timestamp: new Date(new Date().getTime() - 1000 * 60 * 30).toISOString(),
          },
        ],
      },
      {
        id: createId(),
        customerName: 'Eden B.',
        customerEmail: 'eden@example.com',
        itemTitle: 'City apartment rental',
        updatedAt: new Date(new Date().getTime() - 1000 * 60 * 90).toISOString(),
        messages: [
          {
            id: createId(),
            sender: 'customer',
            text: 'Could you share the exact check-in time for the apartment?',
            timestamp: new Date(new Date().getTime() - 1000 * 60 * 90).toISOString(),
          },
        ],
      },
    ];
    localStorage.setItem(OWNER_CONVERSATIONS_KEY, JSON.stringify(initial));
    return initial;
  }
  return stored;
};

export const saveOwnerConversations = (conversations: OwnerConversation[]) =>
  localStorage.setItem(OWNER_CONVERSATIONS_KEY, JSON.stringify(conversations));

export const loadOwnerProfile = (): OwnerProfile => {
  const loaded = safeParse<OwnerProfile>(localStorage.getItem(OWNER_PROFILE_KEY), {
    fullName: 'Fasil Link Seller',
    email: 'owner@example.com',
    phone: '+251 911 000 000',
    businessName: 'FasilLink Marketplace',
    address: 'Gondar, Ethiopia',
    bio: 'Professional owner managing listings across rentals and sales with fast responses and reliable service.',
    avatarUrl: '',
  });

  if (loaded.avatarUrl && loaded.avatarUrl.length > 150000) {
    delete loaded.avatarUrl;
  }

  return loaded;
};

export const saveOwnerProfile = (profile: OwnerProfile) => {
  const profileToSave = { ...profile };

  if (profileToSave.avatarUrl && profileToSave.avatarUrl.length > 150000) {
    delete profileToSave.avatarUrl;
  }

  return saveLocalStorageItem(OWNER_PROFILE_KEY, JSON.stringify(profileToSave));
};

export const loadOwnerSecurity = (): OwnerSecurityState =>
  safeParse<OwnerSecurityState>(localStorage.getItem(OWNER_SECURITY_KEY), {
    password: 'Password123!',
  });

export const saveOwnerSecurity = (security: OwnerSecurityState) =>
  localStorage.setItem(OWNER_SECURITY_KEY, JSON.stringify(security));

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file.'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
