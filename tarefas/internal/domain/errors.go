package domain

import "fmt"

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func NewValidationError(format string, args ...interface{}) *ValidationError {
	return &ValidationError{Message: fmt.Sprintf(format, args...)}
}

type NotFoundError struct {
	Entity string
	ID     string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s with id '%s' not found", e.Entity, e.ID)
}

func NewNotFoundError(entity, id string) *NotFoundError {
	return &NotFoundError{Entity: entity, ID: id}
}
