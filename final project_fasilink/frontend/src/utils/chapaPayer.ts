import api from '../services/api';

type PayerUser = {
  email?: string;
  fullName?: string;
  name?: string;
  phone?: string | null;
} | null | undefined;

export type ChapaPayerDetails = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
};

const TEST_EMAIL = 'test.user@gmail.com';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const getChapaPayerDetails = (user?: PayerUser): ChapaPayerDetails => {
  let email =
    user?.email ||
    localStorage.getItem('fasilink-owner-email') ||
    TEST_EMAIL;
  email = String(email).trim();
  if (!isValidEmail(email)) {
    email = TEST_EMAIL;
  }
  const displayName =
    user?.fullName ||
    user?.name ||
    localStorage.getItem('fasilink-owner-name') ||
    'FasilLink User';
  const parts = displayName.trim().split(/\s+/);
  const phone = localStorage.getItem('fasilink-owner-phone') || undefined;

  return {
    email,
    first_name: parts[0] || 'FasilLink',
    last_name: parts.slice(1).join(' ') || 'User',
    phone_number: phone,
  };
};

/** Load email/name from the API when the session was saved without them. */
export const ensureChapaPayerDetails = async (user?: PayerUser): Promise<ChapaPayerDetails> => {
  const cached = getChapaPayerDetails(user);
  if (isValidEmail(cached.email) && (user?.email || cached.email !== TEST_EMAIL)) {
    return cached;
  }

  try {
    const res = await api.get('/auth/me');
    const profile = res.data?.user;
    if (profile?.email) {
      localStorage.setItem('fasilink-owner-email', profile.email);
    }
    if (profile?.name) {
      localStorage.setItem('fasilink-owner-name', profile.name);
    }
    if (profile?.phone) {
      localStorage.setItem('fasilink-owner-phone', profile.phone);
    }
    return getChapaPayerDetails({
      email: profile?.email,
      name: profile?.name,
      phone: profile?.phone,
    });
  } catch {
    return cached;
  }
};

export const extractChapaCheckoutUrl = (data: Record<string, unknown> | undefined): string | null => {
  if (!data) return null;
  const checkout = data.checkout as Record<string, unknown> | undefined;
  const nested = data.data as Record<string, unknown> | undefined;
  const checkoutNested = checkout?.data as Record<string, unknown> | undefined;
  return (
    (data.checkout_url as string) ||
    (data.checkoutUrl as string) ||
    (nested?.checkout_url as string) ||
    (nested?.checkoutUrl as string) ||
    (checkout?.checkout_url as string) ||
    (checkout?.checkoutUrl as string) ||
    (checkoutNested?.checkout_url as string) ||
    (checkoutNested?.checkoutUrl as string) ||
    null
  );
};

export const extractChapaTxRef = (data: Record<string, unknown> | undefined): string | null => {
  if (!data) return null;
  const nested = data.data as Record<string, unknown> | undefined;
  const returnPath = String(data.return_path || '');
  const fromReturnPath = returnPath.match(/[?&]trx_ref=([^&]+)/i)?.[1];
  return (
    (data.tx_ref as string) ||
    (data.trx_ref as string) ||
    (data.txRef as string) ||
    (nested?.tx_ref as string) ||
    (nested?.trx_ref as string) ||
    (fromReturnPath ? decodeURIComponent(fromReturnPath) : null)
  );
};
