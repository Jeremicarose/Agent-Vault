import { cn } from '@/lib/utils'

interface StepProps {
  number: number
  label: string
  active?: boolean
  completed?: boolean
}

export function Step({ number, label, active, completed }: StepProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded border-2 text-lg font-semibold transition-colors",
          completed
            ? "border-primary bg-primary text-primary-foreground"
            : active
            ? "border-primary text-primary"
            : "border-muted-foreground/30 text-muted-foreground/50"
        )}
      >
        {number}
      </div>
      <span
        className={cn(
          "text-base font-medium transition-colors",
          completed || active ? "text-foreground" : "text-muted-foreground/50"
        )}
      >
        {label}
      </span>
    </div>
  )
}
