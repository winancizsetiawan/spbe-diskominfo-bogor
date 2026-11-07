package handler

import (
	"net/http"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type ReferensiHandler struct {
	instansiRepo repository.InstansiRepository
}

func NewReferensiHandler(instansiRepo repository.InstansiRepository) *ReferensiHandler {
	return &ReferensiHandler{instansiRepo: instansiRepo}
}

// GetInstansi mengembalikan daftar seluruh instansi/OPD untuk pilihan formulir dan filter
func (h *ReferensiHandler) GetInstansi(c *gin.Context) {
	data, err := h.instansiRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil data instansi", nil))
		return
	}

	c.JSON(http.StatusOK, data)
}

