package forge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const apiBase = "https://forge.laravel.com/api/v1"

type Server struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Site struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

type SiteOption struct {
	ProfileUUID string `json:"profileUuid"`
	ServerID    int    `json:"serverId"`
	SiteID      int    `json:"siteId"`
	ServerName  string `json:"serverName"`
	SiteName    string `json:"siteName"`
	Label       string `json:"label"`
}

type forgeCommand struct {
	ID      int    `json:"id"`
	Status  string `json:"status"`
	Command string `json:"command"`
}

func (f *Forge) doRaw(profileUUID, method, path string, body any) ([]byte, error) {
	tok, err := f.tokenForProfile(profileUUID)
	if err != nil {
		return nil, err
	}
	if tok == "" {
		return nil, fmt.Errorf("Forge API token is not set for this profile")
	}

	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequest(method, apiBase+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		msg := strings.TrimSpace(string(raw))
		if msg == "" {
			msg = res.Status
		}
		return nil, fmt.Errorf("Forge API %s %s: %s", method, path, msg)
	}
	return raw, nil
}

func (f *Forge) do(profileUUID, method, path string, body any, out any) error {
	raw, err := f.doRaw(profileUUID, method, path, body)
	if err != nil {
		return err
	}
	if out == nil || len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("Forge API decode %s: %w", path, err)
	}
	return nil
}

func (f *Forge) ListServers(profileUUID string) ([]Server, error) {
	var payload struct {
		Servers []Server `json:"servers"`
	}
	if err := f.do(profileUUID, http.MethodGet, "/servers", nil, &payload); err != nil {
		return nil, err
	}
	return payload.Servers, nil
}

func (f *Forge) ListSites(profileUUID string, serverID int) ([]Site, error) {
	var payload struct {
		Sites []Site `json:"sites"`
	}
	if err := f.do(profileUUID, http.MethodGet, fmt.Sprintf("/servers/%d/sites", serverID), nil, &payload); err != nil {
		return nil, err
	}
	return payload.Sites, nil
}

func (f *Forge) ListAllSites(profileUUID string) ([]SiteOption, error) {
	servers, err := f.ListServers(profileUUID)
	if err != nil {
		return nil, err
	}
	out := make([]SiteOption, 0)
	for _, server := range servers {
		sites, err := f.ListSites(profileUUID, server.ID)
		if err != nil {
			f.log.Errorf("forge list sites for server %d: %v", server.ID, err)
			continue
		}
		for _, site := range sites {
			out = append(out, SiteOption{
				ProfileUUID: profileUUID,
				ServerID:    server.ID,
				SiteID:      site.ID,
				ServerName:  server.Name,
				SiteName:    site.Name,
				Label:       fmt.Sprintf("%s / %s", server.Name, site.Name),
			})
		}
	}
	return out, nil
}

func parseCommandID(raw []byte) int {
	var nested struct {
		Command forgeCommand `json:"command"`
	}
	if json.Unmarshal(raw, &nested) == nil && nested.Command.ID != 0 {
		return nested.Command.ID
	}
	var flat forgeCommand
	if json.Unmarshal(raw, &flat) == nil && flat.ID != 0 {
		return flat.ID
	}
	var wrap struct {
		ID int `json:"id"`
	}
	if json.Unmarshal(raw, &wrap) == nil {
		return wrap.ID
	}
	return 0
}
