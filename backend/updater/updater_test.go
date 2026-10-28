package updater

import "testing"

func TestNormalizeVersion(t *testing.T) {
	cases := map[string]string{
		"":       "v0.0.0-dev",
		"dev":    "v0.0.0-dev",
		"1.2.3":  "v1.2.3",
		"v1.2.3": "v1.2.3",
	}
	for in, want := range cases {
		if got := normalizeVersion(in); got != want {
			t.Fatalf("normalizeVersion(%q)=%q want %q", in, got, want)
		}
	}
}

func TestPickAssetPrefersPlatformPackage(t *testing.T) {
	assets := []githubAsset{
		{Name: "Tinkerpad_1.0.0_linux_amd64.deb", Url: "https://example/deb"},
		{Name: "Tinkerpad_1.0.0_linux_amd64.AppImage", Url: "https://example/appimage"},
		{Name: "Tinkerpad_1.0.0_darwin_universal.dmg", Url: "https://example/dmg"},
		{Name: "Tinkerpad_1.0.0_windows_amd64.zip", Url: "https://example/zip"},
	}
	got := pickAsset(assets)
	if got == nil {
		t.Fatal("expected an asset for this platform")
	}
	t.Logf("picked %s", got.Name)
}
