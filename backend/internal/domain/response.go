package domain

// PagedResponse merepresentasikan data berhalaman sesuai interface Paged<T> di frontend (src/api/client.ts).
type PagedResponse[T any] struct {
	Items      []T `json:"items"`
	Page       int `json:"page"`
	TotalPages int `json:"totalPages"`
	Total      int `json:"total"`
}

// ErrorResponse merepresentasikan struktur error JSON sesuai ApiError di frontend (src/api/client.ts).
type ErrorResponse struct {
	Message string            `json:"message"`
	Errors  map[string]string `json:"errors,omitempty"`
}

// NewErrorResponse helper untuk membuat respons error standar
func NewErrorResponse(message string, fieldErrors map[string]string) ErrorResponse {
	return ErrorResponse{
		Message: message,
		Errors:  fieldErrors,
	}
}

// HealthResponse status kesehatan server
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Service   string `json:"service"`
}

