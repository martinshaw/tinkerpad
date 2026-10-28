package projects

import (
	"encoding/json"
	"slices"
	"strings"
	"tinkerpad/backend/logger"
	"tinkerpad/backend/storage"
)

type Project struct {
	Uuid                string `json:"uuid"`
	Name                string `json:"name"`
	Color               string `json:"color"`
	Runtime             string `json:"runtime"`
	WorkingDir          string `json:"workingDir"`
	PhpBinaryPath       string `json:"phpBinaryPath"`
	SshConfigUuid       string `json:"sshConfigUuid"`
	SshConfigName       string `json:"sshConfigName"`
	DockerContainerId   string `json:"dockerContainerId"`
	DockerContainerName string `json:"dockerContainerName"`
}

type Projects struct {
	log     *logger.Logger
	storage *storage.Storage
}

const filename = "projects.json"

func New() *Projects {
	return &Projects{}
}

func (projects *Projects) Boot(log *logger.Logger, storage *storage.Storage) {
	projects.log = log
	projects.storage = storage
}

func (projects *Projects) GetAll() []Project {
	items := []Project{}
	js, err := projects.storage.Load(filename)
	if err != nil {
		return items
	}
	if err = json.Unmarshal(js, &items); err != nil {
		projects.log.Errorf("failed to unmarshal projects: %v", err)
		return []Project{}
	}
	slices.SortFunc(items, func(a, b Project) int {
		return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
	})

	return items
}

func (projects *Projects) Save(items []Project) error {
	if items == nil {
		items = []Project{}
	}
	js, err := json.Marshal(items)
	if err != nil {
		return err
	}
	if err = projects.storage.Store(js, filename); err != nil {
		return err
	}

	return nil
}
