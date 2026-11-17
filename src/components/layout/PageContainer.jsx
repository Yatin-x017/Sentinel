import { cn } from '../../lib/cn.js'

const widths = { wide: 'max-w-[1200px]', reading: 'max-w-[680px]', narrow: 'max-w-[560px]' }

/** Gutters: 20px mobile, 32px tablet, 48px desktop. */
export function PageContainer({ width = 'wide', className, as: Tag = 'div', ...rest }) {
  return <Tag className={cn('mx-auto w-full px-5 md:px-8 lg:px-12', widths[width], className)} {...rest} />
}
