package handler

import (
	"net/http"

	"spbe-backend/internal/auth"
	"spbe-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// wajibPeran memastikan pengguna sudah masuk dan perannya termasuk yang diizinkan.
// Bila tidak, jawaban 401/403 sudah dikirim dan pemanggil cukup `return`.
// Matriks peran mengikuti frontend/src/auth/permissions.ts; BE tetap sumber otoritatif.
func wajibPeran(c *gin.Context, pesan string, diizinkan ...string) bool {
	masuk, peran := ekstrakRoleLogin(c)
	if !masuk {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return false
	}
	for _, d := range diizinkan {
		if auth.PeranDari(peran) == d {
			return true
		}
	}
	c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: pesan})
	return false
}

// wajibPengelola: Admin OPD dan Super Admin (izin aplikasi:kelola).
func wajibPengelola(c *gin.Context) bool {
	return wajibPeran(c, "Hanya Admin OPD dan Super Admin yang dapat mengakses data ini.", auth.RoleAdminOPD, auth.RoleSuperAdmin)
}

// wajibAdminOPD: hanya Admin OPD (izin validasi:ajukan).
func wajibAdminOPD(c *gin.Context) bool {
	return wajibPeran(c, "Hanya Admin OPD yang dapat mengajukan validasi.", auth.RoleAdminOPD)
}

// ResolverPengguna mencari pengguna dari pengenal (lihat auth.Kunci). Dipasang saat start (main.go).
var ResolverPengguna func(kunci string) (*domain.User, error)

// penggunaSaatIni mengembalikan pengguna yang sedang masuk dan apakah datanya dibatasi pada instansinya
// sendiri (Admin OPD). Super Admin tidak dibatasi. Panggil setelah wajibPengelola/wajibAdminOPD.
// Bila akunnya belum terdaftar di portal, jawaban 403 sudah dikirim dan pemanggil cukup `return`.
func penggunaSaatIni(c *gin.Context) (pengguna *domain.User, terbatas bool, ok bool) {
	masuk, kunci := ekstrakRoleLogin(c)
	if !masuk {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return nil, false, false
	}
	if ResolverPengguna == nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Layanan pengguna belum siap."})
		return nil, false, false
	}
	u, err := ResolverPengguna(kunci)
	if err != nil || u == nil {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Akun Anda belum terdaftar di portal. Hubungi Super Admin."})
		return nil, false, false
	}
	return u, auth.PeranDari(kunci) == auth.RoleAdminOPD, true
}
