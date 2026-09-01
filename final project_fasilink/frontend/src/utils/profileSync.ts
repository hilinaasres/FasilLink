import type { OwnerProfile } from '../pages/owner/ownerStorage';
import { saveOwnerProfile } from '../pages/owner/ownerStorage';

export type ApiUserProfile = {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string | null;
  country?: string;
  city?: string;
  isSeller?: boolean;
  is_seller?: boolean;
  businessName?: string;
  business_name?: string;
  address?: string;
  bio?: string;
  profileImage?: string | null;
};

const buildAddress = (city?: string, country?: string, address?: string) => {
  if (address?.trim()) return address.trim();
  const parts = [city, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Ethiopia';
};

export const buildOwnerProfileFromUser = (user: ApiUserProfile): OwnerProfile => ({
  fullName: user.name || 'Seller',
  email: user.email || '',
  phone: user.phone || '',
  businessName: user.business_name || user.businessName || `${user.name || 'Seller'} Listings`,
  address: buildAddress(user.city, user.country, user.address),
  bio: user.bio || '',
  avatarUrl: user.profileImage || undefined,
});

export const buildCustomerProfileFromUser = (user: ApiUserProfile) => ({
  id: Number(user.id) || 1,
  name: user.name || 'Customer',
  username: (user.email || 'user').split('@')[0],
  email: user.email || '',
  phone: user.phone || '',
  gender: 'Not specified',
  country: user.country || 'Ethiopia',
  city: user.city || 'Gondar',
  address: buildAddress(user.city, user.country, user.address),
  bio: user.bio || '',
  avatar: user.profileImage || '',
  joinDate: new Date().toISOString().slice(0, 10),
  role: 'customer',
});

export const syncProfilesFromApiUser = (user: ApiUserProfile) => {
  const isSeller = Boolean(user.isSeller ?? user.is_seller);

  if (user.phone) {
    try {
      localStorage.setItem('fasilink-owner-phone', user.phone);
    } catch {
      // ignore
    }
  }
  if (user.email) {
    try {
      localStorage.setItem('fasilink-owner-email', user.email);
    } catch {
      // ignore
    }
  }
  if (user.name) {
    try {
      localStorage.setItem('fasilink-owner-name', user.name);
    } catch {
      // ignore
    }
  }

  if (isSeller) {
    saveOwnerProfile(buildOwnerProfileFromUser(user));
  }

  try {
    localStorage.setItem('dash_user', JSON.stringify(buildCustomerProfileFromUser(user)));
  } catch {
    // ignore
  }
};
