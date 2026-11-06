package forge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Forge API v2 (org-scoped). Classic /api/v1 was retired 2026-03-31.
const apiBase = "https://forge.laravel.com/api"

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
	OrgSlug     string `json:"orgSlug"`
	ServerID    int    `json:"serverId"`
	SiteID      int    `json:"siteId"`
	ServerName  string `json:"serverName"`
	SiteName    string `json:"siteName"`
	Label       string `json:"label"`
}

type Organization struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type forgeCommand struct {
	ID      int    `json:"id"`
	Status  string `json:"status"`
	Command string `json:"command"`
}

type jsonAPIResource struct {
	ID         string         `json:"id"`
	Type       string         `json:"type"`
	Attributes map[string]any `json:"attributes"`
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
	req.Header.Set("Accept", "application/vnd.api+json")
	req.Header.Set("Content-Type", "application/vnd.api+json")
	req.Header.Set("User-Agent", "Tinkerpad")

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
		return nil, fmt.Errorf("Forge API %s %s: %s", method, path, summarizeAPIError(res.StatusCode, raw))
	}
	return raw, nil
}

func summarizeAPIError(status int, raw []byte) string {
	msg := strings.TrimSpace(string(raw))
	lower := strings.ToLower(msg)
	if strings.Contains(lower, "<html") || strings.HasPrefix(lower, "<!doctype") {
		hint := http.StatusText(status)
		if status == 404 {
			hint = "not found — token may be invalid, expired, or missing organization access"
		} else if status == 401 || status == 403 {
			hint = "unauthorized — check the API token and its scopes"
		}
		return fmt.Sprintf("%d %s", status, hint)
	}
	if msg == "" {
		return fmt.Sprintf("%d %s", status, http.StatusText(status))
	}
	// Prefer JSON:API error titles when present.
	var doc struct {
		Errors []struct {
			Title  string `json:"title"`
			Detail string `json:"detail"`
			Status string `json:"status"`
		} `json:"errors"`
		Message string `json:"message"`
	}
	if json.Unmarshal(raw, &doc) == nil {
		if len(doc.Errors) > 0 {
			e := doc.Errors[0]
			parts := []string{}
			if e.Status != "" {
				parts = append(parts, e.Status)
			}
			if e.Title != "" {
				parts = append(parts, e.Title)
			}
			if e.Detail != "" {
				parts = append(parts, e.Detail)
			}
			if len(parts) > 0 {
				return strings.Join(parts, " — ")
			}
		}
		if doc.Message != "" {
			return doc.Message
		}
	}
	if len(msg) > 400 {
		return msg[:400] + "…"
	}
	return msg
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

func (f *Forge) getCollection(profileUUID, path string) ([]jsonAPIResource, error) {
	out := make([]jsonAPIResource, 0)
	cursor := ""
	for {
		reqPath := path
		if cursor != "" {
			sep := "?"
			if strings.Contains(path, "?") {
				sep = "&"
			}
			reqPath = path + sep + "page[cursor]=" + url.QueryEscape(cursor)
		}
		var payload struct {
			Data []jsonAPIResource `json:"data"`
			Meta struct {
				NextCursor *string `json:"next_cursor"`
			} `json:"meta"`
		}
		if err := f.do(profileUUID, http.MethodGet, reqPath, nil, &payload); err != nil {
			return nil, err
		}
		out = append(out, payload.Data...)
		if payload.Meta.NextCursor == nil || strings.TrimSpace(*payload.Meta.NextCursor) == "" {
			break
		}
		cursor = *payload.Meta.NextCursor
	}
	return out, nil
}

func attrString(attrs map[string]any, keys ...string) string {
	for _, key := range keys {
		if attrs == nil {
			return ""
		}
		if v, ok := attrs[key]; ok && v != nil {
			switch t := v.(type) {
			case string:
				return t
			case float64:
				return strconv.FormatInt(int64(t), 10)
			case json.Number:
				return t.String()
			default:
				return fmt.Sprint(t)
			}
		}
	}
	return ""
}

func attrInt(attrs map[string]any, keys ...string) int {
	for _, key := range keys {
		if attrs == nil {
			continue
		}
		v, ok := attrs[key]
		if !ok || v == nil {
			continue
		}
		switch t := v.(type) {
		case float64:
			return int(t)
		case json.Number:
			n, _ := t.Int64()
			return int(n)
		case string:
			n, _ := strconv.Atoi(t)
			return n
		case int:
			return t
		}
	}
	return 0
}

func resourceID(r jsonAPIResource) int {
	if id := attrInt(r.Attributes, "id"); id != 0 {
		return id
	}
	n, _ := strconv.Atoi(strings.TrimSpace(r.ID))
	return n
}

func (f *Forge) ListOrganizations(profileUUID string) ([]Organization, error) {
	resources, err := f.getCollection(profileUUID, "/orgs")
	if err != nil {
		return nil, err
	}
	out := make([]Organization, 0, len(resources))
	for _, r := range resources {
		slug := attrString(r.Attributes, "slug")
		if slug == "" {
			slug = strings.TrimSpace(r.ID)
		}
		if slug == "" {
			continue
		}
		name := attrString(r.Attributes, "name")
		if name == "" {
			name = slug
		}
		out = append(out, Organization{Slug: slug, Name: name})
	}
	return out, nil
}

func (f *Forge) ListServers(profileUUID, orgSlug string) ([]Server, error) {
	resources, err := f.getCollection(profileUUID, fmt.Sprintf("/orgs/%s/servers", url.PathEscape(orgSlug)))
	if err != nil {
		return nil, err
	}
	out := make([]Server, 0, len(resources))
	for _, r := range resources {
		id := resourceID(r)
		name := attrString(r.Attributes, "name")
		if id == 0 {
			continue
		}
		if name == "" {
			name = fmt.Sprintf("Server %d", id)
		}
		out = append(out, Server{ID: id, Name: name})
	}
	return out, nil
}

func (f *Forge) ListSites(profileUUID, orgSlug string, serverID int) ([]Site, error) {
	resources, err := f.getCollection(
		profileUUID,
		fmt.Sprintf("/orgs/%s/servers/%d/sites", url.PathEscape(orgSlug), serverID),
	)
	if err != nil {
		return nil, err
	}
	out := make([]Site, 0, len(resources))
	for _, r := range resources {
		id := resourceID(r)
		name := attrString(r.Attributes, "name", "url")
		status := attrString(r.Attributes, "status")
		if id == 0 {
			continue
		}
		if name == "" {
			name = fmt.Sprintf("Site %d", id)
		}
		out = append(out, Site{ID: id, Name: name, Status: status})
	}
	return out, nil
}

func (f *Forge) ListAllSites(profileUUID string) ([]SiteOption, error) {
	orgs, err := f.ListOrganizations(profileUUID)
	if err != nil {
		return nil, err
	}
	if len(orgs) == 0 {
		return nil, fmt.Errorf("No Forge organizations found for this token")
	}

	out := make([]SiteOption, 0)
	for _, org := range orgs {
		servers, err := f.ListServers(profileUUID, org.Slug)
		if err != nil {
			f.log.Errorf("forge list servers for org %s: %v", org.Slug, err)
			continue
		}
		for _, server := range servers {
			sites, err := f.ListSites(profileUUID, org.Slug, server.ID)
			if err != nil {
				f.log.Errorf("forge list sites for org %s server %d: %v", org.Slug, server.ID, err)
				continue
			}
			for _, site := range sites {
				label := fmt.Sprintf("%s / %s", server.Name, site.Name)
				if len(orgs) > 1 {
					label = fmt.Sprintf("%s · %s", org.Name, label)
				}
				out = append(out, SiteOption{
					ProfileUUID: profileUUID,
					OrgSlug:     org.Slug,
					ServerID:    server.ID,
					SiteID:      site.ID,
					ServerName:  server.Name,
					SiteName:    site.Name,
					Label:       label,
				})
			}
		}
	}
	return out, nil
}

func parseCommandID(raw []byte) int {
	if len(raw) == 0 {
		return 0
	}
	var nested struct {
		Data jsonAPIResource `json:"data"`
	}
	if json.Unmarshal(raw, &nested) == nil {
		if id := resourceID(nested.Data); id != 0 {
			return id
		}
	}
	var legacy struct {
		Command forgeCommand `json:"command"`
	}
	if json.Unmarshal(raw, &legacy) == nil && legacy.Command.ID != 0 {
		return legacy.Command.ID
	}
	var flat forgeCommand
	if json.Unmarshal(raw, &flat) == nil && flat.ID != 0 {
		return flat.ID
	}
	return 0
}

func (f *Forge) createSiteCommand(profileUUID, orgSlug string, serverID, siteID int, command string) (int, error) {
	path := fmt.Sprintf(
		"/orgs/%s/servers/%d/sites/%d/commands",
		url.PathEscape(orgSlug),
		serverID,
		siteID,
	)
	raw, err := f.doRaw(profileUUID, http.MethodPost, path, map[string]string{"command": command})
	if err != nil {
		return 0, err
	}
	if id := parseCommandID(raw); id != 0 {
		return id, nil
	}

	// POST is async and may return an empty body — resolve via the newest matching command.
	time.Sleep(500 * time.Millisecond)
	listPath := path + "?sort=-created_at&page[size]=10"
	var payload struct {
		Data []jsonAPIResource `json:"data"`
	}
	if err := f.do(profileUUID, http.MethodGet, listPath, nil, &payload); err != nil {
		return 0, err
	}
	for _, r := range payload.Data {
		cmd := attrString(r.Attributes, "command")
		if cmd == command || strings.Contains(cmd, "tinker --execute") {
			if id := resourceID(r); id != 0 {
				return id, nil
			}
		}
	}
	if len(payload.Data) > 0 {
		if id := resourceID(payload.Data[0]); id != 0 {
			return id, nil
		}
	}
	return 0, fmt.Errorf("Forge did not return a command id")
}

func (f *Forge) getSiteCommand(profileUUID, orgSlug string, serverID, siteID, commandID int) (forgeCommand, error) {
	path := fmt.Sprintf(
		"/orgs/%s/servers/%d/sites/%d/commands/%d",
		url.PathEscape(orgSlug),
		serverID,
		siteID,
		commandID,
	)
	var payload struct {
		Data jsonAPIResource `json:"data"`
	}
	if err := f.do(profileUUID, http.MethodGet, path, nil, &payload); err != nil {
		return forgeCommand{}, err
	}
	return forgeCommand{
		ID:      resourceID(payload.Data),
		Status:  attrString(payload.Data.Attributes, "status"),
		Command: attrString(payload.Data.Attributes, "command"),
	}, nil
}

func (f *Forge) getSiteCommandOutput(profileUUID, orgSlug string, serverID, siteID, commandID int) (string, error) {
	path := fmt.Sprintf(
		"/orgs/%s/servers/%d/sites/%d/commands/%d/output",
		url.PathEscape(orgSlug),
		serverID,
		siteID,
		commandID,
	)
	var payload struct {
		Data jsonAPIResource `json:"data"`
	}
	if err := f.do(profileUUID, http.MethodGet, path, nil, &payload); err != nil {
		return "", err
	}
	return attrString(payload.Data.Attributes, "output"), nil
}
