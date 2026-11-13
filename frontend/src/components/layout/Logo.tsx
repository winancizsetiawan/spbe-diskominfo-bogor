/** Logo portal. `terang` dipakai di atas latar biru tua. */
export function Logo({ terang = false }: { terang?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <img
        src="/logo bogor.png"
        alt="Logo Pemerintah Kota Bogor"
        className="h-12 w-12"
      />
      <span className="leading-tight whitespace-nowrap">
        <span className={`block text-xl font-bold ${terang ? 'text-white' : 'text-brand-900'}`}>SPBE</span>
        <span className={`block text-[13px] ${terang ? 'text-brand-100' : 'text-slate-500'}`}>Pemerintah Kota Bogor</span>
      </span>
    </span>
  )
}
