import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'

/** Tabel data dengan scroll horizontal di layar sempit. `caption` dibacakan pembaca layar. */
export function Table({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Th({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase ${className}`}
      {...props}
    />
  )
}

export function Td({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`border-b border-slate-100 px-4 py-3 align-middle ${className}`} {...props} />
}
