export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-background-border bg-background-elevated px-2 py-1 text-xs text-text-secondary shadow-lg group-hover:block">
        {label}
      </span>
    </span>
  )
}
