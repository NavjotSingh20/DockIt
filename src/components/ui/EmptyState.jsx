import { FileX, PlusCircle } from 'lucide-react';

export default function EmptyState({ title, description, action, actionLabel, icon: Icon = FileX }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center mb-6">
        <Icon size={36} className="text-accent" />
      </div>
      <h3 className="text-xl font-bold font-display text-ink mb-2">{title}</h3>
      {description && <p className="text-ink-muted text-sm max-w-sm mb-6">{description}</p>}
      {action && (
        <button onClick={action} className="btn-primary">
          <PlusCircle size={18} /> {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}
