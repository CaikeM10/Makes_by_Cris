import Link from 'next/link'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LinkButtonProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>

/** Link com a aparência de botão (o Button do base-ui não aceita asChild). */
export function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

type AnchorButtonProps = React.ComponentProps<'a'> & VariantProps<typeof buttonVariants>

/** Âncora externa com a aparência de botão. */
export function AnchorButton({ className, variant, size, ...props }: AnchorButtonProps) {
  return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
