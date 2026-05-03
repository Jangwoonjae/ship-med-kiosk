interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical' | 'empty';
  className?: string;
}

const labels = { normal: '정상', warning: '경고', critical: '긴급', empty: '품절' };
const colors = {
  normal: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
  empty: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-sm font-medium ${colors[status]} ${className}`}>
      {labels[status]}
    </span>
  );
}
