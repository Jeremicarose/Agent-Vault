'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSuggestedTags, MAX_TAGS, type CategoryId } from '../model/tags'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  onBlur?: () => void
  category?: string | null
  maxTags?: number
}

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function TagInput({ value, onChange, onBlur, category, maxTags = MAX_TAGS }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestedTags = getSuggestedTags(category as CategoryId | null, value).slice(0, 10)
  const canAddMore = value.length < maxTags

  const addTag = useCallback(
    (tag: string) => {
      const normalized = normalizeTag(tag)
      if (normalized && !value.includes(normalized) && value.length < maxTags) {
        onChange([...value, normalized])
        setInputValue('')
      }
    },
    [value, onChange, maxTags]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove))
    },
    [value, onChange]
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      {/* Current tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      {canAddMore && (
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={value.length === 0 ? 'Add tags...' : 'Add more tags...'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200)
              onBlur?.()
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {value.length}/{maxTags}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestedTags.length > 0 && canAddMore && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center">Suggestions:</span>
          {suggestedTags.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => addTag(tag)}
            >
              <Plus className="size-3" />
              {tag}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
