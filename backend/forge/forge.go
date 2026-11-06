package forge

import (
	"tinkerpad/backend/logger"
	"tinkerpad/backend/storage"
)

type Forge struct {
	log     *logger.Logger
	storage *storage.Storage
}

func New() *Forge {
	return &Forge{}
}

func (f *Forge) Boot(log *logger.Logger, storage *storage.Storage) {
	f.log = log
	f.storage = storage
}
