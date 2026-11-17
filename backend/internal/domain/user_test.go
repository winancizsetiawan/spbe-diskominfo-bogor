package domain

import (
	"reflect"
	"testing"
)

func TestVerifikatorHanyaTambahanASN(t *testing.T) {
	kasus := []struct {
		nama string
		u    User
		mau  []Role
	}{
		{"ASN tanpa hak tambahan", User{Role: RoleASN}, []Role{RoleASN, RoleAkademisi}},
		{"ASN diberi Verifikator", User{Role: RoleASN, DaftarPeranRaw: "asn,akademisi,verifikator"}, []Role{RoleASN, RoleAkademisi, RoleVerifikator}},
		{"sedang aktif sebagai Verifikator", User{Role: RoleVerifikator, DaftarPeranRaw: "asn,verifikator"}, []Role{RoleASN, RoleVerifikator}},
		{"Admin OPD tidak bisa Verifikator", User{Role: RoleAdminOPD, DaftarPeranRaw: "admin_opd,verifikator"}, []Role{RoleAdminOPD}},
		{"akun id 1 tidak lagi otomatis Verifikator", User{ID: 1, Role: RoleASN}, []Role{RoleASN, RoleAkademisi}},
	}
	for _, k := range kasus {
		if got := k.u.DaftarPeran(); !reflect.DeepEqual(got, k.mau) {
			t.Errorf("%s: %v, mau %v", k.nama, got, k.mau)
		}
	}
	if (User{Role: RoleAdminOPD, DaftarPeranRaw: "admin_opd,verifikator"}).PunyaPeran(RoleVerifikator) {
		t.Error("Admin OPD tidak boleh punya peran Verifikator")
	}
}
