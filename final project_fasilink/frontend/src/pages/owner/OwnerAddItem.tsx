import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, UploadCloud, Check, CreditCard, Sparkles, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ensureChapaPayerDetails, extractChapaCheckoutUrl, extractChapaTxRef } from '../../utils/chapaPayer';
import {
  clearChapaPaymentContext,
  getChapaReturnParams,
  saveChapaPaymentContext,
} from '../../utils/chapaPayment';
import {
  fileToDataUrl,
  loadOwnerItems,
  OwnerItem,
  OwnerItemStatus,
  saveOwnerItems,
} from './ownerStorage';

type CategoryConfigField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: string[];
};

type CategoryConfig = {
  itemInfoFields?: CategoryConfigField[];
  amenities?: string[];
  priceTypes?: string[];
  rentTypes?: string[];
};

type CategoryOption = {
  name: string;
  category_config?: CategoryConfig;
};

const supportedCategories = ['Homes', 'Land', 'Vehicles', 'Event Materials'];

const OwnerAddItem = () => {
  const [items, setItems] = useState<OwnerItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [saleType, setSaleType] = useState<'Sell' | 'Rent'>('Sell');
  const [specialLocation, setSpecialLocation] = useState('');
  const [location, setLocation] = useState('Gondar');
  const [contactPhone, setContactPhone] = useState('');
  const [premium, setPremium] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const eventAmenityOptions = ['Capacity (Guests)', 'Material Type', 'Used Condition', 'New Condition', 'Delivery Available', 'Quantity Available'];
  const rentTypeOptions = ['Daily', 'Monthly', 'Yearly'];

  const [subcity, setSubcity] = useState('Fasil');
  const [kebele, setKebele] = useState('');
  const [legalDocument, setLegalDocument] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Dynamic Fields
  const [homeBedrooms, setHomeBedrooms] = useState('');
  const [homeWiFi, setHomeWiFi] = useState(false);
  const [homeBalcony, setHomeBalcony] = useState(false);
  const [homeAmenities, setHomeAmenities] = useState<string[]>([]);

  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleTransmission, setVehicleTransmission] = useState('Manual');
  const [vehicleFuel, setVehicleFuel] = useState('Petrol');
  const [vehicleAmenities, setVehicleAmenities] = useState<string[]>([]);

  const [eventLocationIndoor, setEventLocationIndoor] = useState(true);
  const [eventCapacity, setEventCapacity] = useState('');
  const [eventSetupIncluded, setEventSetupIncluded] = useState(false);
  const [eventAmenities, setEventAmenities] = useState<string[]>([]);

  const [rentType, setRentType] = useState('Monthly');
  const [dynamicInfoValues, setDynamicInfoValues] = useState<Record<string, string>>({});
  const [dynamicAmenities, setDynamicAmenities] = useState<string[]>([]);
  const [dynamicPriceType, setDynamicPriceType] = useState('');


  // Dynamic Charging System states
  const [calculatedFee, setCalculatedFee] = useState<{
    fee_percentage: number;
    fee_amount: number;
    rule_id: number | null;
    rule_details?: {
      category: string;
      transaction_type: string;
      listing_type: string;
    };
    message?: string;
  } | null>(null);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    itemId: string;
    feeAmount: number;
    title: string;
    imageUrls: string[];
    newItemData: OwnerItem;
    feeDetails?: {
      fee_percentage: number;
      fee_amount: number;
      rule_id: number | null;
      rule_details?: {
        category: string;
        transaction_type: string;
        listing_type: string;
      };
      message?: string;
    };
  } | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    setItems(loadOwnerItems());
  }, []);

  useEffect(() => {
    const loadOwnerPhone = async () => {
      const cached = localStorage.getItem('fasilink-owner-phone');
      if (cached) {
        setContactPhone(cached);
      }
      try {
        const response = await api.get('/auth/me');
        const phone = response.data?.user?.phone;
        if (phone) {
          setContactPhone(phone);
          localStorage.setItem('fasilink-owner-phone', phone);
        }
      } catch {
        // ignore
      }
    };
    loadOwnerPhone();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get('/discover/categories');
        const loaded: CategoryOption[] = (response.data?.categories || [])
          .map((cat: any) => {
            const rawConfig = cat?.category_config;
            const parsedConfig = typeof rawConfig === 'string'
              ? (() => { try { return JSON.parse(rawConfig); } catch { return {}; } })()
              : (rawConfig || {});
            return {
              name: String(cat?.name || '').trim(),
              category_config: parsedConfig,
            };
          })
          .filter((entry: CategoryOption) => entry.name);

        if (loaded.length > 0) {
          setCategories(loaded);
          setCategory((current) => {
            if (current && loaded.some((entry) => entry.name === current)) return current;
            return loaded[0].name;
          });
          return;
        }
      } catch {
        // Fallback to defaults below.
      }

      const fallback = supportedCategories.map((name) => ({ name }));
      setCategories(fallback);
      setCategory((current) => {
        if (current && fallback.some((entry) => entry.name === current)) return current;
        return fallback[0].name;
      });
    };

    loadCategories();
  }, []);

  const selectedCategoryConfig = useMemo(() => {
    return categories.find((entry) => entry.name === category)?.category_config;
  }, [categories, category]);

  const hasDynamicConfig = useMemo(() => {
    return Boolean(
      selectedCategoryConfig && (
        (selectedCategoryConfig.itemInfoFields || []).length > 0 ||
        (selectedCategoryConfig.amenities || []).length > 0 ||
        (selectedCategoryConfig.priceTypes || []).length > 0
      )
    );
  }, [selectedCategoryConfig]);

  useEffect(() => {
    if (!selectedCategoryConfig) {
      setDynamicInfoValues({});
      setDynamicAmenities([]);
      setDynamicPriceType('');
      return;
    }

    setDynamicInfoValues((prev) => {
      const next: Record<string, string> = {};
      (selectedCategoryConfig.itemInfoFields || []).forEach((field) => {
        const key = String(field?.key || '').trim();
        if (!key) return;
        next[key] = prev[key] || '';
      });
      return next;
    });
    setDynamicAmenities([]);
    setDynamicPriceType(selectedCategoryConfig.priceTypes?.[0] || '');
  }, [selectedCategoryConfig, category]);

  // Debounced fee calculation
  useEffect(() => {
    let active = true;
    const fetchFee = async () => {
      const numPrice = Number(price);
      if (!price || isNaN(numPrice) || numPrice <= 0 || !category) {
        setCalculatedFee(null);
        return;
      }
      try {
        const response = await api.post('/charging/calculate', {
          listing_type: 'New Item',
          transaction_type: saleType === 'Rent' ? 'Rent' : 'Sale',
          category,
          price: numPrice,
          premium,
        });
        if (active && response.data?.success) {
          setCalculatedFee(response.data);
        }
      } catch (err) {
        console.error('Error calculating fee:', err);
      }
    };

    const debounceTimer = setTimeout(fetchFee, 300);
    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [price, category, saleType, premium]);

  useEffect(() => {
    const nextPreviews: Promise<string>[] = files.map(fileToDataUrl);
    if (files.length === 0) {
      setPreviews([]);
      return;
    }
    Promise.all(nextPreviews).then(setPreviews).catch(() => setPreviews([]));
  }, [files]);

  const canSubmit = useMemo(
    () =>
      title.trim() &&
      category.trim() &&
      description.trim() &&
      contactPhone.trim() &&
      Number(price) > 0 &&
      previews.length > 0,
    [title, category, description, contactPhone, price, previews.length]
  );

  const resetForm = useCallback(() => {
    setTitle('');
    setCategory(categories[0]?.name || '');
    setDescription('');
    setPrice('');
    setDiscountPrice('');
    setSaleType('Sell');
    setSpecialLocation('');
    setLocation('Gondar');
    const cachedPhone = localStorage.getItem('fasilink-owner-phone');
    if (cachedPhone) setContactPhone(cachedPhone);
    setPremium(false);
    setFiles([]);
    setPreviews([]);
    setError('');
    setSuccess('');
    setPaymentMessage('');
    setSubcity('Fasil');
    setKebele('');
    setLegalDocument(null);
    setTermsAccepted(false);
    setHomeBedrooms('');
    setHomeWiFi(false);
    setHomeBalcony(false);
    setHomeAmenities([]);
    setVehicleYear('');
    setVehicleTransmission('Manual');
    setVehicleFuel('Petrol');
    setVehicleAmenities([]);
    setEventCapacity('');
    setEventLocationIndoor(true);
    setEventSetupIncluded(false);
    setEventAmenities([]);
    setRentType('Monthly');
    setDynamicInfoValues({});
    setDynamicAmenities([]);
    setDynamicPriceType('');
    setPaymentCompleted(false);

  }, [categories]);

  const toggleStringValue = (values: string[], value: string) => {
    return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
  };

  const handleFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const combined = [...prev, ...incoming].slice(0, 5);
      return combined;
    });
    setError('');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/')));
  };

  useEffect(() => {
    const { paymentSuccess, txRef } = getChapaReturnParams(searchParams);

    const verifyPayment = async (txRefValue: string) => {
      try {
        setPaymentLoading(true);
        const response = await api.get(`/payment/verify/${encodeURIComponent(txRefValue)}`, {
          params: { trx_ref: txRefValue, status: searchParams.get('status') || 'success' },
        });
        if (response.data?.message?.includes('verified')) {
          setPaymentCompleted(true);
          setPaymentMessage(
            response.data?.item_status === 'active'
              ? 'Payment verified. Your listing is now active.'
              : 'Payment verified. Your listing is pending admin approval.'
          );
          clearChapaPaymentContext();
          localStorage.removeItem('owner_pending_item');
          resetForm();
          setSuccess(response.data?.message || 'Payment verified successfully.');
          navigate('/seller/manage', { replace: true });
          return;
        } else {
          setError('Payment verification failed. Please try again.');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Payment verification failed.');
      } finally {
        setPaymentLoading(false);
      }
    };

    if (paymentSuccess && txRef && !paymentCompleted) {
      verifyPayment(txRef);
    }
  }, [searchParams, paymentCompleted, items, navigate, resetForm]);

  const handleCheckoutPayment = async () => {
    if (!checkoutData) return;
    setPaying(true);
    setError('');
    setSuccess('');
    try {
      const payer = await ensureChapaPayerDetails(user);
      localStorage.setItem('owner_pending_item', JSON.stringify(checkoutData.newItemData));

      const customization = {
        title: (checkoutData.title || 'FasilLink List').slice(0, 16),
        description: (`Listing fee: ${checkoutData.title || 'Listing'}`).slice(0, 50),
      };

      const returnBase = window.location.pathname.startsWith('/seller')
        ? '/seller'
        : window.location.pathname.startsWith('/customer-posting')
        ? '/customer-posting'
        : '/owner';

      const response = await api.post('/payment/initialize', {
        amount: checkoutData.feeAmount,
        itemId: checkoutData.itemId,
        item_id: checkoutData.itemId,
        return_base: returnBase,
        customization,
        ...payer,
      });

      const checkoutUrl = extractChapaCheckoutUrl(response.data);
      const txRef = extractChapaTxRef(response.data);
      if (checkoutUrl && txRef) {
        saveChapaPaymentContext(txRef, checkoutData.itemId);
        window.location.assign(checkoutUrl);
        return;
      }

      throw new Error(
        (response.data as { error?: string; message?: string })?.error ||
        (response.data as { error?: string; message?: string })?.message ||
        'Chapa checkout URL not found'
      );
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Payment execution failed.'
      );
    } finally {
      setPaying(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!canSubmit) {
      if (!title.trim()) {
        setError('Please enter a title for your item.');
      } else if (!category.trim()) {
        setError('Please select a category.');
      } else if (!price || Number(price) <= 0) {
        setError('Please enter a valid price greater than 0.');
      } else if (!description.trim()) {
        setError('Please enter a description for your item.');
      } else if (!contactPhone.trim()) {
        setError('Please enter a contact phone number.');
      } else if (previews.length === 0) {
        setError('Please upload at least one image.');
      } else if (!legalDocument) {
        setError('Please upload a legal document/carta.');
      } else if (!kebele) {
        setError('Please enter a kebele.');
      } else if (!termsAccepted) {
        setError('You must accept the terms and conditions.');
      } else {
        setError('Complete all required fields and attach at least one image.');
      }
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls = await Promise.all(files.map(fileToDataUrl));
      const form = new FormData();
      form.append('title', title.trim());
      form.append('category', category);
      form.append('description', description.trim());
      form.append('price', String(Number(price)));
      form.append('transaction_type', saleType.toLowerCase());
      form.append('location', specialLocation.trim() || location.trim() || 'Gondar');
      form.append('premium', String(premium));
      if (contactPhone.trim()) {
        form.append('contact_phone', contactPhone.trim());
      }
            const metadata: any = {};
      if (selectedCategoryConfig && ((selectedCategoryConfig.itemInfoFields || []).length > 0 || (selectedCategoryConfig.amenities || []).length > 0 || (selectedCategoryConfig.priceTypes || []).length > 0)) {
        metadata.itemInfo = dynamicInfoValues;
        metadata.amenities = dynamicAmenities;
        if (dynamicPriceType) {
          metadata.priceType = dynamicPriceType;
        }
      } else if (category === 'Homes' || category === 'Land') {
         metadata.bedrooms = homeBedrooms ? Number(homeBedrooms) : null;
         metadata.wifi = homeWiFi;
         metadata.balcony = homeBalcony;
         metadata.amenities = homeAmenities;
      } else if (category === 'Vehicles') {
         metadata.year = vehicleYear ? Number(vehicleYear) : null;
         metadata.transmission = vehicleTransmission;
         metadata.fuel = vehicleFuel;
         metadata.amenities = vehicleAmenities;
      } else if (category === 'Event Materials') {
         metadata.locationIndoor = eventLocationIndoor;
         metadata.capacity = eventCapacity ? Number(eventCapacity) : null;
         metadata.setupIncluded = eventSetupIncluded;
         metadata.amenities = eventAmenities;
      }
      if (saleType === 'Rent') {
        metadata.rentType = selectedCategoryConfig?.rentTypes?.includes(rentType)
          ? rentType
          : (selectedCategoryConfig?.rentTypes?.[0] || rentType);
      }

      form.append('subcity', subcity);
      form.append('kebele', kebele);
      form.append('metadata', JSON.stringify(metadata));
      if (legalDocument) {
        form.append('legal_document', legalDocument);
      }
      
      files.slice(0, 5).forEach((file) => form.append('images', file));

      const postPath = window.location.pathname.startsWith('/customer-posting') ? '/items/customer' : '/items';
      const response = await api.post(postPath, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const requiresPayment = response.data?.requires_payment === true;
      const itemId = String(response.data?.item_id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

      const newItem: OwnerItem = {
        id: itemId,
        title: title.trim(),
        category,
        description: description.trim(),
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        saleType,
        specialLocation: specialLocation.trim() || undefined,
        premium,
        status: (requiresPayment ? 'Pending' : 'Active') as OwnerItemStatus,
        location: location.trim() || undefined,
        images: imageUrls,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (requiresPayment) {
        const nextItems = [newItem, ...items];
        saveOwnerItems(nextItems);
        setItems(nextItems);

        setCheckoutData({
          itemId,
          feeAmount: response.data.fee_amount,
          title: title.trim(),
          imageUrls,
          newItemData: newItem,
          feeDetails: calculatedFee ? { ...calculatedFee } : undefined
        });
        setShowCheckoutModal(true);
      } else {
        const nextItems = [newItem, ...items];
        saveOwnerItems(nextItems);
        setItems(nextItems);
        setSuccess('Item published successfully. Customers can now see it.');
        resetForm();
          navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/manage' : '/owner/manage');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to publish item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">New listing</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Add a professional item listing</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Create a polished seller listing that includes pricing, description, and image previews. Published items appear immediately for customers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900/80">Current items: {items.length}</div>
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900/80">Default status: Active</div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-3xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 opacity-100 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            Reset Form
          </button>
          {/* Publish button intentionally removed from this header area */}
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          {success}
        </div>
      )}

      <form id="owner-add-item-form" onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Item Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="Example: Compact event speaker package"
              required
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            >
              {categories.map((option) => (
                <option key={option.name} value={option.name}>{option.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Price (ETB)
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="1000"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Discount Price (optional)
            <input
              type="number"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="850"
            />
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Sale type
            <select
              value={saleType}
              onChange={(e) => setSaleType(e.target.value as 'Sell' | 'Rent')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            >
              <option value="Sell">Sell</option>
              <option value="Rent">Rent</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Special location
            <input
              type="text"
              value={specialLocation}
              onChange={(e) => setSpecialLocation(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="E.g. near university, city center"
            />
          </label>
        </div>

        {saleType === 'Rent' && (
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Rent Type
            <select
              value={rentType}
              onChange={(e) => setRentType(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            >
              {(selectedCategoryConfig?.rentTypes?.length ? selectedCategoryConfig.rentTypes : rentTypeOptions).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        )}

        {hasDynamicConfig && (
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{category} details</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fields configured from admin category logic.</p>
            </div>

            {(selectedCategoryConfig?.priceTypes || []).length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Price Type</div>
                <div className="flex flex-wrap gap-4">
                  {(selectedCategoryConfig?.priceTypes || []).map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <input
                        type="radio"
                        name="dynamicPriceType"
                        value={option}
                        checked={dynamicPriceType === option}
                        onChange={() => setDynamicPriceType(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(selectedCategoryConfig?.itemInfoFields || []).length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {(selectedCategoryConfig?.itemInfoFields || []).map((field) => {
                  const key = String(field?.key || '').trim();
                  const label = String(field?.label || key || 'Field');
                  const type = field?.type || 'text';
                  const options = field?.options || [];
                  if (!key) return null;

                  return (
                    <label key={key} className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {label}
                      {type === 'select' && options.length > 0 ? (
                        <select
                          value={dynamicInfoValues[key] || ''}
                          onChange={(e) => setDynamicInfoValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                        >
                          <option value="" disabled hidden>Select {label}</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={type === 'number' ? 'number' : 'text'}
                          value={dynamicInfoValues[key] || ''}
                          onChange={(e) => setDynamicInfoValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {(selectedCategoryConfig?.amenities || []).length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Amenities</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(selectedCategoryConfig?.amenities || []).map((option) => (
                    <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={dynamicAmenities.includes(option)}
                        onChange={() => setDynamicAmenities((current) => toggleStringValue(current, option))}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!hasDynamicConfig && category === 'Homes' && (
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Homes details</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add bedroom count and amenities.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Number of Bedrooms
                <input
                  type="number"
                  value={homeBedrooms}
                  onChange={(e) => setHomeBedrooms(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Amenities</div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={homeWiFi}
                    onChange={() => setHomeWiFi(!homeWiFi)}
                  />
                  📶 WiFi Available
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={homeBalcony}
                    onChange={() => setHomeBalcony(!homeBalcony)}
                  />
                  🪟 Balcony
                </label>
              </div>
            </div>
          </div>
        )}

        {!hasDynamicConfig && category === 'Vehicles' && (
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Vehicle details</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add year, transmission, and fuel type.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Year
                <input
                  type="number"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Transmission
                <select
                  value={vehicleTransmission}
                  onChange={(e) => setVehicleTransmission(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Fuel Type
                <select
                  value={vehicleFuel}
                  onChange={(e) => setVehicleFuel(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {!hasDynamicConfig && category === 'Event Materials' && (
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Event materials details</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add capacity and location type for event inventory.</p>
            </div>

            <div>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Capacity
                <input
                  type="number"
                  value={eventCapacity}
                  onChange={(e) => setEventCapacity(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-500/20"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Location Type</div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <input
                    type="radio"
                    name="eventLocation"
                    checked={eventLocationIndoor}
                    onChange={() => setEventLocationIndoor(true)}
                  />
                  🏠 Indoor
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <input
                    type="radio"
                    name="eventLocation"
                    checked={!eventLocationIndoor}
                    onChange={() => setEventLocationIndoor(false)}
                  />
                  🌿 Outdoor
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Services</div>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={eventSetupIncluded}
                  onChange={() => setEventSetupIncluded(!eventSetupIncluded)}
                />
                ✅ Setup Included
              </label>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Amenities</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {eventAmenityOptions.map((option) => (
                  <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={eventAmenities.includes(option)}
                      onChange={() => setEventAmenities((current) => toggleStringValue(current, option))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <input
              type="checkbox"
              checked={premium}
              onChange={(e) => setPremium(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 bg-white text-brand-600"
            />
            Add premium placement for extra exposure
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Contact phone
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="0912345678"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Location (optional)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="Gondar, Ethiopia"
            />
          </label>
        </div>

        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            required
          />
        </label>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Subcity
            <select
              value={subcity}
              onChange={(e) => setSubcity(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            >
              <option>Fasil</option>
              <option>Arada</option>
              <option>Maraki</option>
              <option>Azezo Teda</option>
              <option>Zobel</option>
              <option>Jantekel</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Kebele
            <input
              type="text"
              value={kebele}
              onChange={(e) => setKebele(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="e.g., 1 or 12"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label htmlFor="legal_document" className="text-sm font-medium text-slate-700 dark:text-slate-200">Legal document (PDF or DOC)</label>
          <input
            id="legal_document"
            type="file"
            accept=".pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setLegalDocument(e.target.files ? e.target.files[0] : null)}
            className="text-sm text-slate-700"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="termsAccepted"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 bg-white text-brand-600"
          />
          <label htmlFor="termsAccepted" className="text-sm text-slate-600 dark:text-slate-300">
            I accept the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">terms and conditions</a>
          </label>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Images</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Drag, drop, or choose up to 5 product images.</p>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">{previews.length} attached</span>
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-950"
          >
            <UploadCloud size={28} className="text-brand-600" />
            <div className="max-w-md text-sm leading-6">
              Drop 1 or more images here, or click to browse. Supported formats: JPG and PNG.
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
              <Plus size={16} /> Browse files
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []).filter((file) => file.type.startsWith('image/'));
                  handleFiles(selected);
                }}
              />
            </label>
          </div>
        </div>

        {previews.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((src, index) => {
              const isVideo = src.startsWith('data:video');
              return (
                <div key={src + index} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {isVideo ? (
                    <video controls className="h-48 w-full object-cover">
                      <source src={src} />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img src={src} alt={`Preview ${index + 1}`} className="h-48 w-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {paymentMessage && (
          <div className="rounded-3xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700 dark:border-brand-700/40 dark:bg-brand-900/20 dark:text-brand-200">
            {paymentMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-3xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 opacity-100 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white opacity-100 shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            {submitting ? 'Publishing...' : 'Publish item'}
          </button>
        </div>
      </form>

      {/* Checkout Payment Modal */}
      {showCheckoutModal && checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/65 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in duration-200 flex flex-col">
            {/* Header */}
            <div className="relative border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <button
                type="button"
                aria-label="Close checkout modal"
                title="Close checkout modal"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setSuccess('Item listing created as "Pending". You can pay later to publish.');
                  resetForm();
                  navigate(window.location.pathname.startsWith('/customer-posting') ? '/customer-posting/manage' : '/owner/manage');
                }}
                className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <Sparkles size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">Payment Required</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Pay Listing Publication Fee</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                To list this item on FasilLink, please complete the publication fee payment.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 scrolling-touch">
              {/* Item Info Box */}
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/40 space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Listing Preview</div>
                <div className="flex items-center gap-3">
                  {checkoutData.imageUrls && checkoutData.imageUrls[0] ? (
                    <img 
                      src={checkoutData.imageUrls[0]} 
                      alt={checkoutData.title} 
                      className="h-12 w-16 rounded-xl object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="h-12 w-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      <CreditCard size={18} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{checkoutData.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Category: {checkoutData.newItemData.category} • {checkoutData.newItemData.saleType === 'Rent' ? 'Rent' : 'Sale'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Posting fee confirmation</div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Before redirecting to Chapa, review the amount required to publish your listing. This fee is calculated from the current charging rule for your selected category and transaction type.
                </p>
                {checkoutData.feeDetails?.rule_details ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                    <div className="font-semibold">Rule details</div>
                    <div>Listing type: {checkoutData.feeDetails.rule_details.listing_type}</div>
                    <div>Transaction type: {checkoutData.feeDetails.rule_details.transaction_type}</div>
                    <div>Category: {checkoutData.feeDetails.rule_details.category}</div>
                    <div>Fee percentage: {checkoutData.feeDetails.fee_percentage}%</div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                    <div className="font-semibold">Rule summary</div>
                    <div>No active charging rule was matched, so this listing fee is calculated from the current price and platform settings.</div>
                  </div>
                )}
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/40">
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Item price</span>
                    <span>ETB {checkoutData.newItemData.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Calculated fee</span>
                    <span>ETB {checkoutData.feeAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 my-2"></div>
                  <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-slate-100">
                    <span>Total due</span>
                    <span>ETB {checkoutData.feeAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Option</label>
                <div className="rounded-2xl border border-brand-300 bg-brand-100 p-4 text-sm font-medium text-brand-900 opacity-100 dark:border-brand-500/40 dark:bg-brand-500/20 dark:text-brand-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <Check size={16} className="text-brand-600 dark:text-brand-400" />
                    Chapa
                  </div>
                  <p className="mt-1 text-xs leading-5 opacity-80">Pay with mobile money or card through the secure Chapa checkout.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 dark:bg-slate-950/50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setSuccess('Item listing created as "Pending". You can pay later to publish.');
                  resetForm();
                  navigate('/owner/manage');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Pay Later
              </button>
              <button
                type="button"
                onClick={handleCheckoutPayment}
                disabled={paying}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-slate-950 !bg-slate-950 px-5 py-2.5 text-sm font-semibold !text-white opacity-100 shadow-lg shadow-slate-900/25 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                {paying ? 'Processing...' : `Proceed to Chapa to pay ETB ${checkoutData.feeAmount.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(OwnerAddItem);
