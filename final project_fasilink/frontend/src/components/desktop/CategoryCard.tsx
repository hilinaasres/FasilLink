import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Truck, Zap, Plus } from 'lucide-react';
import { categorySlugFromName, searchPathForCategory } from '../../utils/categoryUtils';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  count?: number;
  image?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  homes: <Home className="w-7 h-7" />,
  vehicles: <Truck className="w-7 h-7" />,
  'event materials': <Zap className="w-7 h-7" />,
};

const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  name,
  icon,
  count = 0,
}) => {
  const displayIcon = icon || iconMap[name.toLowerCase()] || <Plus className="w-10 h-10" />;
  const slug = categorySlugFromName(name);
  const linkTo = slug ? searchPathForCategory(slug) : `/search?category=${encodeURIComponent(name)}`;

  return (
    <Link to={linkTo}>
      <div className="bg-white rounded-[18px] overflow-hidden shadow-soft hover:shadow-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer group min-w-[150px] h-[105px] flex flex-col items-center justify-center p-5 hover:border-[#6C3BFF] border-2 border-transparent">
        {/* Icon */}
        <div className="text-[#6C3BFF] group-hover:scale-110 transition-transform duration-300 mb-3">
          {displayIcon}
        </div>

        {/* Name */}
        <div className="text-center">
          <h3 className="font-semibold text-neutral-900 group-hover:text-[#6C3BFF] transition-colors text-base">
            {name}
          </h3>
          {count > 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              {count.toLocaleString()} listings
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
