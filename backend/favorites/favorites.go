package favorites

import (
	"encoding/json"
	"os"
	"slices"
	"strings"
	"time"
	"tinkerpad/backend/logger"
	"tinkerpad/backend/storage"

	"github.com/google/uuid"
)

type Favorites struct {
	log     *logger.Logger
	storage *storage.Storage
}

type Favorite struct {
	Uuid        string   `json:"uuid"`
	Name        string   `json:"name"`
	Code        string   `json:"code"`
	WorkingDir  string   `json:"workingDir"`
	Timestamp   int      `json:"timestamp"`
	Tags        []string `json:"tags"`
	Folder      string   `json:"folder"`
	Description string   `json:"description"`
	ProjectId   string   `json:"projectId"`
}

const filename = "favorites.json"

func New() *Favorites {
	return &Favorites{}
}

func (favs *Favorites) Boot(log *logger.Logger, storage *storage.Storage) {
	favs.log = log
	favs.storage = storage
}

func (favs *Favorites) GetAll() []Favorite {
	favorites := []Favorite{}
	js, err := favs.storage.Load(filename)
	if err != nil {
		return favorites
	}
	if err = json.Unmarshal(js, &favorites); err != nil {
		favs.log.Errorf("failed to unmarshal favorites: %v", err)
	}
	slices.SortFunc(favorites, func(a, b Favorite) int {
		return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
	})
	return favorites
}

func (favs *Favorites) Save(favorites []Favorite) error {
	if favorites == nil {
		favorites = []Favorite{}
	}
	for i := range favorites {
		if favorites[i].Tags == nil {
			favorites[i].Tags = []string{}
		}
	}
	js, err := json.Marshal(favorites)
	if err != nil {
		return err
	}
	if err = favs.storage.Store(js, filename); err != nil {
		return err
	}
	return nil
}

func (favs *Favorites) Export(path string) error {
	if path == "" {
		return nil
	}
	js, err := json.MarshalIndent(favs.GetAll(), "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, js, 0644)
}

func (favs *Favorites) Import(path string) ([]Favorite, error) {
	if path == "" {
		return favs.GetAll(), nil
	}
	js, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	incoming := []Favorite{}
	if err = json.Unmarshal(js, &incoming); err != nil {
		return nil, err
	}

	existing := favs.GetAll()
	for _, favorite := range incoming {
		if favorite.Name == "" || favorite.Code == "" {
			continue
		}
		if favorite.Tags == nil {
			favorite.Tags = []string{}
		}
		if slices.ContainsFunc(existing, func(item Favorite) bool {
			return item.Uuid == favorite.Uuid || (item.Name == favorite.Name && item.Folder == favorite.Folder && item.Code == favorite.Code)
		}) {
			continue
		}
		if favorite.Uuid == "" {
			favorite.Uuid = uuid.NewString()
		}
		if favorite.Timestamp == 0 {
			favorite.Timestamp = int(time.Now().UnixMilli())
		}
		existing = append(existing, favorite)
	}
	if err = favs.Save(existing); err != nil {
		return nil, err
	}

	return favs.GetAll(), nil
}

func (favs *Favorites) AddLaravelStarters() ([]Favorite, error) {
	existing := favs.GetAll()
	for _, starter := range laravelStarters() {
		if slices.ContainsFunc(existing, func(item Favorite) bool {
			return item.Name == starter.Name && item.Folder == starter.Folder
		}) {
			continue
		}
		existing = append(existing, starter)
	}
	if err := favs.Save(existing); err != nil {
		return nil, err
	}

	return favs.GetAll(), nil
}

func laravelStarters() []Favorite {
	now := int(time.Now().UnixMilli())
	snippets := []struct {
		name        string
		description string
		code        string
	}{
		{
			name:        "App name",
			description: "Read the application name from config.",
			code:        "<?php\n\nconfig('app.name');\n",
		},
		{
			name:        "Latest user",
			description: "Load the newest App\\Models\\User. Change the class if the app uses another user model.",
			code:        "<?php\n\n\\App\\Models\\User::query()->latest()->first();\n",
		},
		{
			name:        "Failed jobs",
			description: "Show the 20 most recent failed queue jobs.",
			code:        "<?php\n\nDB::table('failed_jobs')->orderByDesc('failed_at')->limit(20)->get();\n",
		},
		{
			name:        "Named routes",
			description: "List named routes registered on the application.",
			code:        "<?php\n\ncollect(app('router')->getRoutes())->map(fn ($route) => [\n    'method' => implode('|', $route->methods()),\n    'uri' => $route->uri(),\n    'name' => $route->getName(),\n    'action' => $route->getActionName(),\n])->filter(fn ($route) => $route['name'])->values();\n",
		},
	}

	favorites := make([]Favorite, 0, len(snippets))
	for _, snippet := range snippets {
		favorites = append(favorites, Favorite{
			Uuid:        uuid.NewString(),
			Name:        snippet.name,
			Code:        snippet.code,
			Description: snippet.description,
			Folder:      "Laravel",
			Tags:        []string{"laravel"},
			Timestamp:   now,
		})
	}

	return favorites
}
