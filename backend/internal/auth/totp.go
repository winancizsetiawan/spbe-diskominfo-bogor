package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const (
	totpPeriodeDetik = 30
	totpDigit        = 6
)

// BuatRahasiaTOTP menghasilkan kunci rahasia acak 160-bit dalam format Base32 tanpa padding.
func BuatRahasiaTOTP() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b), nil
}

// BuatURITOTP membentuk URI otpauth:// standar untuk dipindai oleh Google/Microsoft Authenticator.
func BuatURITOTP(penerbit, akun, rahasia string) string {
	label := url.PathEscape(penerbit + ":" + akun)
	q := url.Values{}
	q.Set("secret", rahasia)
	q.Set("issuer", penerbit)
	q.Set("algorithm", "SHA1")
	q.Set("digits", "6")
	q.Set("period", "30")
	return fmt.Sprintf("otpauth://totp/%s?%s", label, q.Encode())
}

// VerifikasiTOTP memeriksa kode 6 digit terhadap jendela waktu saat ini (+/- 1 langkah 30 detik).
func VerifikasiTOTP(rahasia, kode string, sekarang time.Time) bool {
	bersihKode := strings.TrimSpace(kode)
	if len(bersihKode) != totpDigit {
		return false
	}
	bersihRahasia := strings.ToUpper(strings.TrimSpace(rahasia))
	kunci, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(bersihRahasia)
	if err != nil || len(kunci) == 0 {
		return false
	}

	langkahSekarang := sekarang.Unix() / totpPeriodeDetik
	for offset := int64(-1); offset <= 1; offset++ {
		harapan := hitungTOTP(kunci, langkahSekarang+offset)
		if subtle.ConstantTimeCompare([]byte(bersihKode), []byte(harapan)) == 1 {
			return true
		}
	}
	return false
}

func hitungTOTP(kunci []byte, counter int64) string {
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(counter))
	mac := hmac.New(sha1.New, kunci)
	mac.Write(buf[:])
	sum := mac.Sum(nil)

	offset := sum[len(sum)-1] & 0x0f
	bin := (int(sum[offset]&0x7f) << 24) |
		(int(sum[offset+1]&0xff) << 16) |
		(int(sum[offset+2]&0xff) << 8) |
		int(sum[offset+3]&0xff)

	kode := bin % 1_000_000
	return fmt.Sprintf("%06d", kode)
}
