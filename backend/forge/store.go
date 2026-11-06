package forge

import (
	"encoding/json"
	"fmt"
	"strings"
	"tinkerpad/backend/encrypt"

	"github.com/google/uuid"
)

const filename = "forge.json"

type Profile struct {
	Uuid     string `json:"uuid"`
	Name     string `json:"name"`
	APIToken string `json:"apiToken"`
	Color    string `json:"color"`
}

// ProfileView is safe to send to the frontend (no raw token).
type ProfileView struct {
	Uuid         string `json:"uuid"`
	Name         string `json:"name"`
	Color        string `json:"color"`
	TokenMasked  string `json:"tokenMasked"`
	HasToken     bool   `json:"hasToken"`
}

type Data struct {
	Profiles []Profile `json:"profiles"`
	// Legacy single-token fields — migrated on load.
	APIToken       string `json:"apiToken,omitempty"`
	LastServerID   int    `json:"lastServerId,omitempty"`
	LastSiteID     int    `json:"lastSiteId,omitempty"`
	LastServerName string `json:"lastServerName,omitempty"`
	LastSiteName   string `json:"lastSiteName,omitempty"`
}

func (f *Forge) load() Data {
	data := Data{Profiles: []Profile{}}
	raw, err := f.storage.Load(filename)
	if err != nil || len(raw) == 0 {
		return data
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		f.log.Errorf("failed to unmarshal forge config: %v", err)
		return Data{Profiles: []Profile{}}
	}
	if data.Profiles == nil {
		data.Profiles = []Profile{}
	}
	if migrated := f.migrateLegacy(&data); migrated {
		_ = f.save(data)
	}
	return data
}

func (f *Forge) migrateLegacy(data *Data) bool {
	if data.APIToken == "" || len(data.Profiles) > 0 {
		return false
	}
	data.Profiles = append(data.Profiles, Profile{
		Uuid:     uuid.NewString(),
		Name:     "Default",
		APIToken: data.APIToken,
		Color:    "#f53003",
	})
	data.APIToken = ""
	return true
}

func (f *Forge) save(data Data) error {
	data.APIToken = ""
	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return f.storage.Store(raw, filename)
}

func maskToken(tok string) string {
	if tok == "" {
		return ""
	}
	if len(tok) <= 8 {
		return strings.Repeat("•", len(tok))
	}
	return tok[:4] + strings.Repeat("•", len(tok)-8) + tok[len(tok)-4:]
}

func (f *Forge) profileByUUID(id string) (*Profile, error) {
	data := f.load()
	for i := range data.Profiles {
		if data.Profiles[i].Uuid == id {
			return &data.Profiles[i], nil
		}
	}
	return nil, fmt.Errorf("Forge profile not found")
}

func (f *Forge) tokenForProfile(profileUUID string) (string, error) {
	profile, err := f.profileByUUID(profileUUID)
	if err != nil {
		return "", err
	}
	if profile.APIToken == "" {
		return "", nil
	}
	return encrypt.Decrypt(profile.APIToken)
}

func (f *Forge) GetProfiles() []ProfileView {
	data := f.load()
	out := make([]ProfileView, 0, len(data.Profiles))
	for _, p := range data.Profiles {
		tok, _ := encrypt.Decrypt(p.APIToken)
		out = append(out, ProfileView{
			Uuid:        p.Uuid,
			Name:        p.Name,
			Color:       p.Color,
			TokenMasked: maskToken(tok),
			HasToken:    tok != "",
		})
	}
	return out
}

// SaveProfile creates or updates a named token profile.
// Pass an empty uuid to create. Leave token empty on update to keep the existing token.
func (f *Forge) SaveProfile(profileUUID, name, token, color string) (ProfileView, error) {
	name = strings.TrimSpace(name)
	token = strings.TrimSpace(token)
	color = strings.TrimSpace(color)
	if name == "" {
		return ProfileView{}, fmt.Errorf("profile name is required")
	}
	if color == "" {
		color = "#f53003"
	}

	data := f.load()
	if profileUUID == "" {
		if token == "" {
			return ProfileView{}, fmt.Errorf("API token is required for a new profile")
		}
		enc, err := encrypt.Encrypt(token)
		if err != nil {
			return ProfileView{}, err
		}
		p := Profile{
			Uuid:     uuid.NewString(),
			Name:     name,
			APIToken: enc,
			Color:    color,
		}
		data.Profiles = append(data.Profiles, p)
		if err := f.save(data); err != nil {
			return ProfileView{}, err
		}
		return ProfileView{
			Uuid:        p.Uuid,
			Name:        p.Name,
			Color:       p.Color,
			TokenMasked: maskToken(token),
			HasToken:    true,
		}, nil
	}

	idx := -1
	for i := range data.Profiles {
		if data.Profiles[i].Uuid == profileUUID {
			idx = i
			break
		}
	}
	if idx < 0 {
		return ProfileView{}, fmt.Errorf("Forge profile not found")
	}
	data.Profiles[idx].Name = name
	data.Profiles[idx].Color = color
	if token != "" {
		enc, err := encrypt.Encrypt(token)
		if err != nil {
			return ProfileView{}, err
		}
		data.Profiles[idx].APIToken = enc
	}
	if err := f.save(data); err != nil {
		return ProfileView{}, err
	}
	tok, _ := encrypt.Decrypt(data.Profiles[idx].APIToken)
	return ProfileView{
		Uuid:        data.Profiles[idx].Uuid,
		Name:        data.Profiles[idx].Name,
		Color:       data.Profiles[idx].Color,
		TokenMasked: maskToken(tok),
		HasToken:    tok != "",
	}, nil
}

func (f *Forge) DeleteProfile(profileUUID string) error {
	data := f.load()
	next := make([]Profile, 0, len(data.Profiles))
	found := false
	for _, p := range data.Profiles {
		if p.Uuid == profileUUID {
			found = true
			continue
		}
		next = append(next, p)
	}
	if !found {
		return fmt.Errorf("Forge profile not found")
	}
	data.Profiles = next
	return f.save(data)
}
