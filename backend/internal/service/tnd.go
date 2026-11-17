package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Login ASN lewat akun TND Pemkot Bogor (https://tnd.kotabogor.go.id/api-baru/api/v1/login).
// Portal meneruskan NIP dan kata sandi ke TND, server ke server. Kata sandi dan token TND tidak disimpan;
// dari jawaban TND hanya diambil data yang diperlukan portal (NIP, nama, email, OPD, jabatan). NIK tidak diambil.

var (
	// ErrTNDDitolak: TND menolak NIP/kata sandi (atau jawaban tidak menyatakan berhasil).
	ErrTNDDitolak = errors.New("NIP atau kata sandi TND salah.")
	// ErrTNDTidakTersedia: TND tidak dapat dihubungi atau menjawab galat server.
	ErrTNDTidakTersedia = errors.New("Layanan login TND sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.")
	// ErrTNDTidakAktif: login TND berhasil tetapi status pegawai/aparatur tidak aktif.
	ErrTNDTidakAktif = errors.New("Status kepegawaian Anda di TND tidak aktif. Hubungi pengelola kepegawaian.")

	polaNIP = regexp.MustCompile(`^\d{18}$`)
)

// AdalahNIP: username 18 digit diperlakukan sebagai NIP ASN dan diperiksa ke TND.
func AdalahNIP(s string) bool { return polaNIP.MatchString(strings.TrimSpace(s)) }

// PegawaiTND adalah data pegawai yang dipakai portal dari jawaban login TND.
type PegawaiTND struct {
	NIP     string
	Nama    string
	Email   string
	NamaPD  string
	OpdID   int
	Jabatan string
}

// KlienTND memanggil API login TND.
type KlienTND struct {
	URL  string
	HTTP *http.Client
}

func NewKlienTND(url string, batasWaktu time.Duration) *KlienTND {
	if batasWaktu <= 0 {
		batasWaktu = 10 * time.Second
	}
	return &KlienTND{URL: url, HTTP: &http.Client{Timeout: batasWaktu}}
}

type jawabanTND struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		User struct {
			Nama           string `json:"nama"`
			NIP            string `json:"nip"`
			Email          string `json:"email"`
			NamaPD         string `json:"nama_pd"`
			OpdID          int    `json:"opd_id"`
			NamaJabatan    string `json:"nama_jabatan"`
			Jabatan        string `json:"jabatan"`
			Status         string `json:"status"`
			StatusAparatur string `json:"statusaparatur"`
		} `json:"user"`
	} `json:"data"`
}

// Login memeriksa NIP dan kata sandi ke TND. Dianggap berhasil HANYA bila HTTP 200, status "success",
// dan NIP di jawaban sama dengan NIP yang dikirim. Bentuk jawaban lain apa pun dianggap ditolak.
func (k *KlienTND) Login(ctx context.Context, nip, sandi string) (*PegawaiTND, error) {
	body, _ := json.Marshal(map[string]string{"username": nip, "password": sandi})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.URL, bytes.NewReader(body))
	if err != nil {
		return nil, ErrTNDTidakTersedia
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	res, err := k.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w (%v)", ErrTNDTidakTersedia, err)
	}
	defer res.Body.Close()
	isi, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 500 {
		return nil, fmt.Errorf("%w (HTTP %d)", ErrTNDTidakTersedia, res.StatusCode)
	}
	if res.StatusCode != http.StatusOK {
		return nil, ErrTNDDitolak
	}
	var j jawabanTND
	if err := json.Unmarshal(isi, &j); err != nil {
		return nil, ErrTNDDitolak
	}
	u := j.Data.User
	if !strings.EqualFold(j.Status, "success") || strings.TrimSpace(u.NIP) != nip {
		return nil, ErrTNDDitolak
	}
	aktif := func(s string) bool { return s == "" || strings.EqualFold(s, "aktif") }
	if !aktif(u.Status) || !aktif(u.StatusAparatur) {
		return nil, ErrTNDTidakAktif
	}
	jabatan := strings.TrimSpace(u.NamaJabatan)
	if jabatan == "" {
		jabatan = strings.TrimSpace(u.Jabatan)
	}
	return &PegawaiTND{
		NIP:     nip,
		Nama:    strings.TrimSpace(u.Nama),
		Email:   strings.ToLower(strings.TrimSpace(u.Email)),
		NamaPD:  strings.TrimSpace(u.NamaPD),
		OpdID:   u.OpdID,
		Jabatan: jabatan,
	}, nil
}
