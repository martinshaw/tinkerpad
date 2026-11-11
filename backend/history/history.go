package history

import (
	"encoding/json"
	"sort"
	"tinkerpad/backend/logger"
	"tinkerpad/backend/storage"
)

type History struct {
	log     *logger.Logger
	storage *storage.Storage
}

type HistoryLog struct {
	Uuid       string `json:"uuid"`
	Code       string `json:"code"`
	WorkingDir string `json:"workingDir"`
	Timestamp  int    `json:"timestamp"`
}

const filename = "history.json"

func New() *History {
	return &History{}
}

func (h *History) Boot(log *logger.Logger, storage *storage.Storage) {
	h.log = log
	h.storage = storage
}

func (h *History) load() []HistoryLog {
	logs := []HistoryLog{}
	js, err := h.storage.Load(filename)
	if err != nil {
		return logs
	}
	if err = json.Unmarshal(js, &logs); err != nil {
		h.log.Errorf("failed to unmarshal history: %v", err)
		return []HistoryLog{}
	}
	return logs
}

func (h *History) GetAll() []HistoryLog {
	logs := h.load()
	sort.SliceStable(logs, func(i, j int) bool {
		return logs[i].Timestamp > logs[j].Timestamp
	})
	return logs
}

func (h *History) AddLog(log HistoryLog) error {
	logs := append(h.load(), log)
	if len(logs) > 100 {
		logs = logs[len(logs)-100:]
	}
	js, err := json.Marshal(logs)
	if err != nil {
		return err
	}
	if err = h.storage.Store(js, filename); err != nil {
		return err
	}
	return nil
}
