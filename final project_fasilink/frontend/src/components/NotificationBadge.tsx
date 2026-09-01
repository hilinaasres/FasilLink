import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, className = '' }) => {
  if (count <= 0) return null;

  return (
    <span
      className={`absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default NotificationBadge;
