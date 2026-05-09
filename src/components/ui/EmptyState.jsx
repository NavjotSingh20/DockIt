import { FileX, PlusCircle } from 'lucide-react';

export default function EmptyState({ title, description, action, actionLabel, icon: Icon = FileX }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Icon size={36} className="text-blue-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-sm mb-6">{description}</p>}
      {action && (
        <button onClick={action} className="btn-primary">
          <PlusCircle size={18} /> {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}
