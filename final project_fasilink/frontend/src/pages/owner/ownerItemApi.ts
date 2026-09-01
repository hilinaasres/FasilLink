import api from '../../services/api';
import type { OwnerItem, OwnerItemStatus } from './ownerStorage';

const PLACEHOLDER =
  'https://via.placeholder.com/800x600?text=No+Image+Available';

export const mapDbStatusToOwnerStatus = (status: string): OwnerItemStatus => {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'sold') return 'Sold';
  if (s === 'rented') return 'Rented';
  if (s === 'pending_approval' || s === 'pending_payment' || s === 'rejected') return 'Pending';
  return 'Pending';
};

export const mapOwnerStatusToDb = (status: OwnerItemStatus): string => {
  switch (status) {
    case 'Active':
      return 'active';
    case 'Sold':
      return 'sold';
    case 'Rented':
      return 'rented';
    default:
      return 'pending_approval';
  }
};

export const mapApiRowToOwnerItem = (row: {
  id: number | string;
  title: string;
  description?: string;
  price: number | string;
  status?: string;
  status_label?: string;
  transaction_type?: string;
  location?: string;
  category?: string;
  featured?: boolean;
  premium?: boolean;
  created_at?: string;
  image_url?: string;
}): OwnerItem => {
  const created = row.created_at || new Date().toISOString();
  return {
    id: String(row.id),
    title: row.title,
    category: row.category || 'Uncategorized',
    description: row.description || '',
    price: Number(row.price || 0),
    saleType: String(row.transaction_type || 'sell').toLowerCase() === 'rent' ? 'Rent' : 'Sell',
    status: mapDbStatusToOwnerStatus(row.status_label || row.status || 'pending'),
    location: row.location || undefined,
    featured: Boolean(row.featured),
    premium: Boolean(row.premium),
    images: [row.image_url || PLACEHOLDER],
    createdAt: created,
    updatedAt: created,
  };
};

export const fetchOwnerItems = async (): Promise<OwnerItem[]> => {
  const base = window.location.pathname.startsWith('/customer-posting') ? '/items/mine-customer' : '/items/mine';
  const response = await api.get(base);
  const rows = response.data?.items || [];
  return rows.map(mapApiRowToOwnerItem);
};

export type RenewalPreview = {
  item: {
    id: number;
    title: string;
    price: number;
    status: string;
    status_label: string;
    transaction_type: string;
    category: string;
    location: string;
    image_url?: string;
  };
  renewal: {
    fee_amount: number;
    fee_percentage: number;
    rule_id: number | null;
    requires_payment: boolean;
    listing_type: string;
    transaction_type: string;
    category: string;
  };
};

export class RenewalRequiredError extends Error {
  itemId: string;
  constructor(itemId: string, message?: string) {
    super(message || 'Renewal payment required');
    this.name = 'RenewalRequiredError';
    this.itemId = itemId;
  }
}

export const fetchRenewalPreview = async (id: string): Promise<RenewalPreview> => {
  const base = window.location.pathname.startsWith('/customer-posting') ? `/items/${id}/renewal-preview-customer` : `/items/${id}/renewal-preview`;
  const response = await api.get(base);
  return response.data;
};

const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const axiosErr = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return (
    axiosErr.response?.data?.error ||
    axiosErr.response?.data?.message ||
    axiosErr.message ||
    fallback
  );
};

export const isRenewalRequiredError = (
  err: unknown
): err is { itemId: string; message?: string } => {
  if (err instanceof RenewalRequiredError) return true;
  const renewalErr = err as { name?: string; itemId?: string };
  return renewalErr.name === 'RenewalRequiredError' && Boolean(renewalErr.itemId);
};

export const updateOwnerItemApi = async (
  id: string,
  payload: Partial<OwnerItem>
): Promise<OwnerItem> => {
  try {
    const path = window.location.pathname.startsWith('/customer-posting') ? `/items/${id}/customer` : `/items/${id}`;
    const response = await api.patch(path, {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      price: payload.price,
      location: payload.location,
      status: payload.status ? mapOwnerStatusToDb(payload.status) : undefined,
    });
    const row = response.data?.item;
    if (!row) {
      throw new Error('Server did not return the updated listing.');
    }
    return mapApiRowToOwnerItem(row);
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { status?: number; data?: { requires_renewal?: boolean; error?: string } };
    };
    if (axiosErr.response?.status === 402 && axiosErr.response?.data?.requires_renewal) {
      throw new RenewalRequiredError(id, axiosErr.response.data.error);
    }
    throw err;
  }
};

export { getApiErrorMessage };

export const deleteOwnerItemApi = async (id: string): Promise<void> => {
  const path = window.location.pathname.startsWith('/customer-posting') ? `/items/${id}/customer` : `/items/${id}`;
  await api.delete(path);
};
