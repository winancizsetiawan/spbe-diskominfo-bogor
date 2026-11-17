package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func mesin(mw ...gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	_ = r.SetTrustedProxies(nil)
	r.Use(mw...)
	r.GET("/x", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	return r
}

func TestHeaderKeamanan(t *testing.T) {
	r := mesin(HeaderKeamanan(true))
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	r.ServeHTTP(w, req)
	for k, v := range map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Cache-Control":          "no-store",
	} {
		if got := w.Header().Get(k); got != v {
			t.Errorf("%s = %q, diharapkan %q", k, got, v)
		}
	}
	if w.Header().Get("Content-Security-Policy") == "" {
		t.Error("CSP tidak terpasang")
	}
	if w.Header().Get("Strict-Transport-Security") == "" {
		t.Error("HSTS harus terpasang di produksi lewat HTTPS")
	}

	// Di HTTP biasa, HSTS tidak dipasang.
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
	if w.Header().Get("Strict-Transport-Security") != "" {
		t.Error("HSTS tidak boleh dipasang untuk permintaan HTTP")
	}
}

func TestBatasLaju(t *testing.T) {
	r := mesin(BatasLaju(3, time.Minute))
	kode := func(ip string) (int, string) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/x", nil)
		req.RemoteAddr = ip + ":1234"
		r.ServeHTTP(w, req)
		return w.Code, w.Header().Get("Retry-After")
	}
	for i := 1; i <= 3; i++ {
		if c, _ := kode("10.0.0.1"); c != 200 {
			t.Fatalf("permintaan %d seharusnya lolos, dapat %d", i, c)
		}
	}
	c, retry := kode("10.0.0.1")
	if c != http.StatusTooManyRequests || retry == "" {
		t.Errorf("permintaan ke-4 harus 429 + Retry-After, dapat %d %q", c, retry)
	}
	if c, _ := kode("10.0.0.2"); c != 200 {
		t.Errorf("IP lain tidak boleh ikut terblokir, dapat %d", c)
	}
}
