import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

/** Kelas tombol, juga dipakai untuk <Link> yang tampil sebagai tombol. */
export function buttonClass(variant: Variant = 'primary', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${extra}`
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}
