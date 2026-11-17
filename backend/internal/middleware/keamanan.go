package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// HeaderKeamanan memasang header pengaman pada setiap respons API (Buku Panduan B.9 dan B.13).
// Respons API berupa JSON atau berkas unduhan, jadi CSP-nya melarang semua muatan aktif.
// CSP untuk halaman web (berkas FE) dipasang di server statis; contoh ada di docs/NGINX.md.
func HeaderKeamanan(produksi bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
		h.Set("Cross-Origin-Resource-Policy", "same-site")
		// Jawaban API berisi data per pengguna; jangan disimpan cache bersama.
		h.Set("Cache-Control", "no-store")
		// HSTS hanya bermakna lewat HTTPS; browser mengabaikannya di HTTP.
		if produksi && (c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")) {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

type jendela struct {
	mulai  time.Time
	hitung int
}

// BatasLaju membatasi jumlah permintaan per alamat IP dalam satu jendela waktu (jendela tetap).
// Berlebih dijawab 429 dengan Retry-After. Pencatatan IP mengandalkan c.ClientIP; di belakang
// proxy, atur trusted proxies agar IP klien yang dipakai, bukan IP proxy.
func BatasLaju(maks int, durasi time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	data := map[string]*jendela{}
	terakhirBersih := time.Now()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		mu.Lock()
		if now.Sub(terakhirBersih) > 5*durasi {
			for k, j := range data {
				if now.Sub(j.mulai) > durasi {
					delete(data, k)
				}
			}
			terakhirBersih = now
		}
		j := data[ip]
		if j == nil || now.Sub(j.mulai) >= durasi {
			j = &jendela{mulai: now}
			data[ip] = j
		}
		j.hitung++
		lewat := j.hitung > maks
		sisa := durasi - now.Sub(j.mulai)
		mu.Unlock()

		if lewat {
			c.Header("Retry-After", itoa(int(sisa.Seconds())+1))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"message": "Terlalu banyak permintaan. Coba lagi sebentar."})
			return
		}
		c.Next()
	}
}

func itoa(n int) string {
	if n <= 0 {
		return "1"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
