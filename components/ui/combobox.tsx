'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown, X, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string // Optional secondary text (email, ID, etc.)
  disabled?: boolean
}

export interface ComboboxProps {
  // Core props
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  
  // Data source
  options?: ComboboxOption[] // Static options
  loadOptions?: (query: string) => Promise<ComboboxOption[]> // Async options
  
  // Customization
  renderOption?: (option: ComboboxOption) => React.ReactNode
  clearable?: boolean
  disabled?: boolean
  required?: boolean
  
  // Validation & messages
  errorMessage?: string
  helperText?: string
  emptyMessage?: string
  
  // Styling
  className?: string
  
  // Async configuration
  debounceMs?: number
  minSearchLength?: number
}

export function Combobox({
  label,
  placeholder = 'Select an option...',
  value,
  onChange,
  options = [],
  loadOptions,
  renderOption,
  clearable = true,
  disabled = false,
  required = false,
  errorMessage,
  helperText,
  emptyMessage = 'No results found',
  className,
  debounceMs = 300,
  minSearchLength = 0,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Determine which options to use
  const isAsync = !!loadOptions
  const allOptions = isAsync ? asyncOptions : options

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (isAsync) return asyncOptions // Async filtering happens server-side
    
    if (!searchQuery) return allOptions
    
    const query = searchQuery.toLowerCase()
    return allOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.sublabel?.toLowerCase().includes(query)
    )
  }, [searchQuery, allOptions, isAsync, asyncOptions])

  // Find selected option
  const selectedOption = allOptions.find((opt) => opt.value === value)

  // Load async options
  const loadAsyncOptions = async (query: string) => {
    if (!loadOptions) return
    
    if (query.length < minSearchLength) {
      setAsyncOptions([])
      return
    }

    setIsLoading(true)
    try {
      const results = await loadOptions(query)
      setAsyncOptions(results)
    } catch (error) {
      console.error('Error loading options:', error)
      setAsyncOptions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search for async
  useEffect(() => {
    if (!isAsync) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAsyncOptions(searchQuery)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, isAsync])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault()
          setIsOpen(true)
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          e.preventDefault()
          const option = filteredOptions[highlightedIndex]
          if (!option.disabled) {
            onChange(option.value)
            setIsOpen(false)
            setSearchQuery('')
          }
        }
        break
        
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          )
        }
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
        
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery('')
        setHighlightedIndex(-1)
        break
        
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const handleToggle = () => {
    if (disabled) return
    
    setIsOpen(!isOpen)
    if (!isOpen) {
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 0)
      
      // Load initial async options if needed
      if (isAsync && asyncOptions.length === 0) {
        loadAsyncOptions('')
      }
    } else {
      setSearchQuery('')
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
    setIsOpen(false)
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
    setHighlightedIndex(-1)
  }

  // Default option renderer
  const defaultRenderOption = (option: ComboboxOption) => (
    <div className="flex flex-col">
      <span className="text-sm text-slate-900">{option.label}</span>
      {option.sublabel && (
        <span className="text-xs text-slate-500">{option.sublabel}</span>
      )}
    </div>
  )

  const optionRenderer = renderOption || defaultRenderOption

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Combobox Button */}
      <div
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative w-full h-11 px-4 pr-10 bg-white border rounded-xl text-sm text-left cursor-pointer transition-all',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent',
          errorMessage
            ? 'border-red-300 focus-within:ring-red-500'
            : 'border-slate-200 hover:border-slate-300',
          disabled && 'bg-slate-50 cursor-not-allowed opacity-60',
          isOpen && 'ring-2 ring-violet-500 border-transparent'
        )}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="combobox-listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Search Input (visible when open) */}
        {isOpen ? (
          <div className="flex items-center h-full">
            <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 h-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          // Display selected value
          <div className="flex items-center h-full text-slate-900">
            {selectedOption ? (
              <span className="truncate">{selectedOption.label}</span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        )}

        {/* Icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {clearable && value && !disabled && !isOpen && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          )}
          {!isLoading && (
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 transition-transform pointer-events-none',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <ul
          ref={listRef}
          id="combobox-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1"
        >
          {isLoading && (
            <li className="px-4 py-3 text-sm text-slate-500 text-center">
              <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
              Loading...
            </li>
          )}

          {!isLoading && filteredOptions.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500 text-center">
              {emptyMessage}
            </li>
          )}

          {!isLoading &&
            filteredOptions.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                className={cn(
                  'px-4 py-2 cursor-pointer transition-colors flex items-center justify-between',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  !option.disabled && highlightedIndex === index && 'bg-violet-50',
                  !option.disabled && 'hover:bg-slate-50',
                  option.value === value && 'bg-violet-50'
                )}
                onClick={() => {
                  if (!option.disabled) {
                    handleSelect(option.value)
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex-1">{optionRenderer(option)}</div>
                {option.value === value && (
                  <Check className="w-4 h-4 text-violet-600 flex-shrink-0 ml-2" />
                )}
              </li>
            ))}
        </ul>
      )}

      {/* Helper Text / Error Message */}
      {(helperText || errorMessage) && (
        <p
          className={cn(
            'text-xs mt-1',
            errorMessage ? 'text-red-500' : 'text-slate-500'
          )}
        >
          {errorMessage || helperText}
        </p>
      )}
    </div>
  )
}

