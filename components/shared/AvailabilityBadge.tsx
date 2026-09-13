import { Availability } from '@/lib/types';

const CONFIG: Record<Availability, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  out_of_stock: {
    label: 'Out of Stock',
    className: 'bg-red-50 text-red-600 border border-red-200',
  },
  coming_soon: {
    label: 'Coming Soon',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  hidden: {
    label: 'Hidden',
    className: 'bg-gray-100 text-gray-500 border border-gray-200',
  },
};

export default function AvailabilityBadge({ status }: { status: Availability }) {
  const { label, className } = CONFIG[status] || CONFIG.available;
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
