import { cn } from '@/lib/utils';

function Dots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
    </div>
  );
}

/** Full-screen centered loading state */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-screen gap-3', className)}>
      <Dots className="text-[#013358] dark:text-blue-400" />
      <span className="text-xs text-gray-400 dark:text-gray-500 tracking-wide">Loading…</span>
    </div>
  );
}

/** Centered in its container — use inside cards / panels */
export function SectionLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center h-40', className)}>
      <Dots className="text-gray-400 dark:text-gray-500" />
    </div>
  );
}

/** Inline button spinner */
export function ButtonLoader({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
    </span>
  );
}

export default ButtonLoader;
