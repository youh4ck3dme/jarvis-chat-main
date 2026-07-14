import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const buttonGroupVariants = cva(
  "flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2",
  {
    variants: {
      orientation: {
        horizontal:
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      className={cn(
        "bg-muted flex items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        'bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto',
        className,
      )}
      {...props}
    />
  )
}

interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Align buttons in the bar
   * @default 'between'
   */
  align?: 'start' | 'center' | 'end' | 'between'
  /**
   * Semantic label for screen readers
   */
  label?: string
}

const alignClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

/**
 * ActionBar Component
 * Container for action buttons with responsive layout
 * Mobile-first design with proper spacing and alignment
 */
function ActionBar({
  className,
  align = 'between',
  label,
  children,
  ...props
}: ActionBarProps) {
  return (
    <div
      role={label ? 'toolbar' : undefined}
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4',
        alignClasses[align],
        'px-2 sm:px-4 py-2 sm:py-3',
        'rounded-lg glass-panel',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CompactButtonGroup Component
 * Specialized for mobile-first button grouping with adaptive sizing
 */
function CompactButtonGroup({
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'primary' | 'secondary'
}) {
  return (
    <div
      className={cn(
        'flex gap-1.5 sm:gap-2 items-center rounded-lg p-1.5 sm:p-2',
        'bg-white/5 backdrop-blur-sm border border-white/10',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  ActionBar,
  CompactButtonGroup,
  buttonGroupVariants,
}
