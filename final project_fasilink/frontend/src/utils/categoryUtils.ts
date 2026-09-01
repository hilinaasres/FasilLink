/** URL slug used in /search?category=... and navbar links */
export type CategorySlug = 'homes' | 'land' | 'vehicles' | 'event-materials';

export const CATEGORY_SLUGS: Record<CategorySlug, string> = {
  homes: 'Homes',
  land: 'Land',
  vehicles: 'Vehicles',
  'event-materials': 'Event Materials',
};

export const categorySlugFromName = (name: string): CategorySlug | null => {
  const lower = name.toLowerCase();
  if (lower.includes('home') || lower.includes('property')) return 'homes';
  if (lower.includes('land') || lower.includes('plot') || lower.includes('lot')) return 'land';
  if (lower.includes('vehicle') || lower.includes('car')) return 'vehicles';
  if (lower.includes('event')) return 'event-materials';
  return null;
};

export const categoryLabelFromSlug = (slug: string): string => {
  if (slug in CATEGORY_SLUGS) {
    return CATEGORY_SLUGS[slug as CategorySlug];
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const searchPathForCategory = (slug: CategorySlug): string =>
  `/search?category=${slug}`;
