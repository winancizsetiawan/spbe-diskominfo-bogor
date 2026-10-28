import { Component, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/States'

interface Props {
  /** Berubah saat pengguna berpindah halaman sehingga error halaman sebelumnya tidak menempel. */
  resetKey: string
  children: ReactNode
}

interface State {
  galat: Error | null
}

/**
 * Menangkap kegagalan menampilkan halaman, terutama chunk yang gagal dimuat
 * (koneksi putus, atau portal baru diperbarui saat tab lama masih terbuka).
 * Navbar dan footer tetap tampil karena boundary berada di dalam layout.
 */
export class HalamanBoundary extends Component<Props, State> {
  state: State = { galat: null }

  static getDerivedStateFromError(galat: Error): State {
    return { galat }
  }

  componentDidCatch(galat: Error) {
    console.error('[halaman] Gagal menampilkan halaman.', galat)
  }

  componentDidUpdate(sebelumnya: Props) {
    if (sebelumnya.resetKey !== this.props.resetKey && this.state.galat) this.setState({ galat: null })
  }

  render() {
    if (!this.state.galat) return this.props.children
    // Detail teknis tidak ditampilkan ke pengguna (Buku Panduan: penanganan error).
    return (
      <ErrorState
        message="Halaman tidak dapat dimuat. Periksa koneksi Anda, atau muat ulang bila portal baru saja diperbarui."
        onRetry={() => window.location.reload()}
      />
    )
  }
}
