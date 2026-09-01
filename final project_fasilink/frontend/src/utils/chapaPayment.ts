const TX_REF_KEY = 'fasilink_chapa_tx_ref';
const ITEM_ID_KEY = 'fasilink_chapa_item_id';

export const saveChapaPaymentContext = (txRef: string, itemId?: string) => {
  try {
    sessionStorage.setItem(TX_REF_KEY, txRef);
    if (itemId) sessionStorage.setItem(ITEM_ID_KEY, itemId);
  } catch {
    // ignore
  }
};

export const clearChapaPaymentContext = () => {
  try {
    sessionStorage.removeItem(TX_REF_KEY);
    sessionStorage.removeItem(ITEM_ID_KEY);
  } catch {
    // ignore
  }
};

/** Chapa appends trx_ref (not tx_ref) on return URL */
export const getChapaReturnParams = (searchParams: URLSearchParams) => {
  const txRef =
    searchParams.get('trx_ref') ||
    searchParams.get('tx_ref') ||
    sessionStorage.getItem(TX_REF_KEY) ||
    '';

  const paymentSuccess =
    searchParams.get('paymentSuccess') === 'true' ||
    searchParams.get('status') === 'success' ||
    searchParams.get('status') === 'successful' ||
    Boolean(txRef);

  const itemId = sessionStorage.getItem(ITEM_ID_KEY) || '';

  return { paymentSuccess, txRef, itemId };
};
