export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src="/logo bogor.png"
        alt="Logo Pemerintah Kota Bogor"
        className="h-10 w-10"
      />
      <span className="leading-tight">
        <span className="block text-lg font-bold text-brand-900">SPBE</span>
        <span className="block text-xs text-slate-500">Pemerintah Kota Bogor</span>
      </span>
    </span>
  )
}
