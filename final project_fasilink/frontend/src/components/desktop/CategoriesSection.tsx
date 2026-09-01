import React, { useState, useEffect } from 'react';
import { Home, Truck, Zap } from 'lucide-react';
import CategoryCard from './CategoryCard';
import api from '../../services/api';

interface Category {
  id: string;
  name: string;
  count?: number;
}

const CategoriesSection: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultCategories: Category[] = [
    { id: '1', name: 'Homes', count: 2400 },
    { id: '2', name: 'Vehicles', count: 1850 },
    { id: '3', name: 'Event Materials', count: 950 },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/discover/categories');
        if (response.data?.categories) {
          setCategories(response.data.categories);
        } else {
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getIconForCategory = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('home')) return <Home className="w-7 h-7" />;
    if (lower.includes('vehicle')) return <Truck className="w-7 h-7" />;
    if (lower.includes('event')) return <Zap className="w-7 h-7" />;
    return <Zap className="w-7 h-7" />;
  };

  if (loading) {
    return (
      <div className="py-12 px-5">
        <div className="max-w-[1280px] mx-auto">
          <div className="h-8 bg-neutral-200 rounded-lg w-48 mb-10"></div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[105px] bg-neutral-100 rounded-[18px]"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 px-5 bg-white">
      <div className="max-w-[1280px] mx-auto">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Browse by Category
          </h2>
          <p className="text-neutral-600">
            Explore our main marketplace categories
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              name={category.name}
              icon={getIconForCategory(category.name)}
              count={category.count}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
