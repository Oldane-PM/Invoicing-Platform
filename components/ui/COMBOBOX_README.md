# Combobox Component - Documentation

## Overview

The Combobox component is a fully accessible, searchable dropdown replacement that provides an enhanced user experience for selecting values from lists of any size. It replaces all traditional `<select>` elements across the Invoice Platform.

## Features

### ✅ Core Functionality
- **Searchable**: Real-time filtering as you type
- **Keyboard Navigation**: Full keyboard support (see below)
- **Async Loading**: Support for large datasets with server-side search
- **Clear Action**: Optional clear/reset functionality
- **Empty States**: Customizable "no results" messaging
- **Loading States**: Built-in loading indicator for async operations
- **Custom Rendering**: Flexible option display with primary and secondary labels
- **Error Handling**: Built-in validation and error message display

### ♿ Accessibility (WCAG 2.1 AA Compliant)

#### Keyboard Navigation
| Key | Action |
|-----|--------|
| `Enter` / `Space` | Open dropdown / Select highlighted option |
| `↓ Arrow Down` | Move to next option / Open dropdown if closed |
| `↑ Arrow Up` | Move to previous option |
| `Esc` | Close dropdown and reset search |
| `Tab` | Close dropdown and move to next focusable element |
| `Type` | Filter options in real-time |

#### ARIA Support
- `role="combobox"` - Identifies the component as a combobox
- `aria-expanded` - Indicates dropdown state (open/closed)
- `aria-haspopup="listbox"` - Indicates presence of listbox
- `aria-controls` - Links combobox to listbox
- `aria-disabled` - Indicates disabled state
- `aria-selected` - Marks selected option in list
- `aria-label` / `aria-labelledby` - Proper label association

#### Focus Management
- Visible focus indicators on all interactive elements
- Automatic focus to search input when opening
- Focus trap within dropdown while open
- Scroll-to-view for keyboard-highlighted items
- Proper tab order maintained

#### Screen Reader Support
- Semantic HTML structure (`<button>`, `<ul>`, `<li>`)
- Descriptive labels for all actions
- Clear announcement of selection changes
- Loading and error state announcements

## Usage

### Basic Example

```tsx
import { Combobox } from '@/components/ui/combobox'

<Combobox
  label="Contract Type"
  placeholder="Select contract type"
  value={contractType}
  onChange={setContractType}
  options={[
    { value: 'internal', label: 'Internal Project' },
    { value: 'client', label: 'Client Facing Project' },
    { value: 'operational', label: 'Operational' },
  ]}
/>
```

### With Sublabels (for better context)

```tsx
<Combobox
  label="Reporting Manager"
  placeholder="Select manager"
  value={managerId}
  onChange={setManagerId}
  options={managers.map(manager => ({
    value: manager.id,
    label: manager.name,
    sublabel: manager.email, // Secondary text in muted color
  }))}
  emptyMessage="No managers found"
/>
```

### Async/Server-Side Search (for large datasets)

```tsx
const loadEmployees = async (query: string) => {
  const response = await fetch(`/api/employees/search?q=${query}`)
  const data = await response.json()
  return data.employees.map(emp => ({
    value: emp.id,
    label: emp.name,
    sublabel: emp.email,
  }))
}

<Combobox
  label="Select Employee"
  placeholder="Search employees..."
  value={employeeId}
  onChange={setEmployeeId}
  loadOptions={loadEmployees}
  debounceMs={300}
  minSearchLength={2}
  emptyMessage="No employees found"
/>
```

### With Validation

```tsx
<Combobox
  label="Rate Type"
  required
  placeholder="Select rate type"
  value={rateType}
  onChange={setRateType}
  options={[
    { value: 'hourly', label: 'Hourly', sublabel: 'Pay by the hour' },
    { value: 'fixed', label: 'Fixed', sublabel: 'Monthly fixed payment' },
  ]}
  errorMessage={errors.rateType}
  helperText="This determines how invoices are calculated"
/>
```

### Disabled State

```tsx
<Combobox
  label="Status"
  value={status}
  onChange={setStatus}
  options={statusOptions}
  disabled={isLoading}
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Label text displayed above combobox |
| `placeholder` | `string` | `"Select an option..."` | Placeholder text when no value selected |
| `value` | `string` | **required** | Currently selected value |
| `onChange` | `(value: string) => void` | **required** | Callback when value changes |
| `options` | `ComboboxOption[]` | `[]` | Static list of options |
| `loadOptions` | `(query: string) => Promise<ComboboxOption[]>` | - | Async function to load options |
| `renderOption` | `(option: ComboboxOption) => ReactNode` | - | Custom option renderer |
| `clearable` | `boolean` | `true` | Show clear button when value selected |
| `disabled` | `boolean` | `false` | Disable the combobox |
| `required` | `boolean` | `false` | Mark field as required (shows asterisk) |
| `errorMessage` | `string` | - | Error message to display |
| `helperText` | `string` | - | Helper text below combobox |
| `emptyMessage` | `string` | `"No results found"` | Message when no options match |
| `className` | `string` | - | Additional CSS classes |
| `debounceMs` | `number` | `300` | Debounce delay for async search |
| `minSearchLength` | `number` | `0` | Minimum characters before async search |

### ComboboxOption Type

```typescript
interface ComboboxOption {
  value: string          // Unique identifier
  label: string          // Primary display text
  sublabel?: string      // Optional secondary text (muted)
  disabled?: boolean     // Option cannot be selected
}
```

## Implementation Coverage

### ✅ Replaced Across All Portals

#### Admin Portal
- **Employee Directory Filters**
  - Contract Type filter
  - Reporting Manager filter (with sublabels showing email)
  - Rate Type filter
  - Employee Status filter
  
- **Admin Dashboard Filters**
  - Role/Contractor Type filter
  - Status filter
  - Project filter
  - Manager filter
  - Month filter
  
- **Employee Contract Info Tab** (Drawer)
  - Rate Type selector (with sublabels)
  - Department selector
  - Reporting Manager selector

#### Manager Portal
- **Dashboard Filters**
  - Status filter
  - Time period filter (Last 30/90 days)

#### Employee Portal
- **Profile Page**
  - Account Type selector
  - Currency selector (with sublabels)
  - Project Type selector

## Performance Considerations

### Local vs Async Search

**Use Local Options When:**
- Dataset < 200 items
- Data is static or changes infrequently
- Fast client-side filtering is acceptable

**Use Async Search When:**
- Dataset > 200 items
- Data is dynamic or frequently updated
- Server-side filtering/searching is required

### Best Practices

1. **For Large Lists**: Use `loadOptions` with proper debouncing (300ms recommended)
2. **Set `minSearchLength`**: Require 2-3 characters before triggering search
3. **Cache Results**: Implement caching in your `loadOptions` function
4. **Provide Sublabels**: Help users identify the correct option (e.g., email for names)
5. **Clear Placeholder Text**: Use descriptive placeholders like "Select employee..." not just "Select..."
6. **Error Handling**: Always handle loading/error states in async scenarios

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Testing Checklist

### Manual Testing

- [ ] **Keyboard Navigation**
  - [ ] Tab focuses the combobox
  - [ ] Enter/Space opens dropdown
  - [ ] Arrow keys navigate options
  - [ ] Escape closes dropdown
  - [ ] Tab closes dropdown and moves focus
  
- [ ] **Search Functionality**
  - [ ] Typing filters options in real-time
  - [ ] Search is case-insensitive
  - [ ] Searches both label and sublabel
  - [ ] Shows empty state when no matches
  
- [ ] **Mouse Interaction**
  - [ ] Click opens/closes dropdown
  - [ ] Click option selects it
  - [ ] Hover highlights option
  - [ ] Clear button removes selection
  
- [ ] **Accessibility**
  - [ ] Screen reader announces label
  - [ ] Screen reader announces selection
  - [ ] Focus indicators visible
  - [ ] Works with keyboard only
  - [ ] Color contrast meets WCAG AA
  
- [ ] **States**
  - [ ] Loading state shows spinner
  - [ ] Empty state shows message
  - [ ] Error state shows error message
  - [ ] Disabled state is non-interactive
  
- [ ] **Edge Cases**
  - [ ] Works with empty options array
  - [ ] Handles very long option labels
  - [ ] Works in modal/drawer contexts
  - [ ] Multiple comboboxes on same page

### Automated Testing (Recommended)

```typescript
// Example Jest + Testing Library test
import { render, screen, fireEvent } from '@testing-library/react'
import { Combobox } from './combobox'

test('opens dropdown on Enter key', () => {
  const { container } = render(
    <Combobox
      value=""
      onChange={jest.fn()}
      options={[{ value: '1', label: 'Option 1' }]}
    />
  )
  
  const combobox = screen.getByRole('combobox')
  fireEvent.keyDown(combobox, { key: 'Enter' })
  
  expect(screen.getByRole('listbox')).toBeInTheDocument()
})

test('filters options on search', async () => {
  render(
    <Combobox
      value=""
      onChange={jest.fn()}
      options={[
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' },
      ]}
    />
  )
  
  fireEvent.click(screen.getByRole('combobox'))
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'Ban' } })
  
  expect(screen.getByText('Banana')).toBeInTheDocument()
  expect(screen.queryByText('Apple')).not.toBeInTheDocument()
})
```

## Migration from Select

### Before (Old Select)
```tsx
<select
  value={contractType}
  onChange={(e) => setContractType(e.target.value)}
  className="..."
>
  <option value="">Select</option>
  <option value="internal">Internal</option>
  <option value="client">Client</option>
</select>
```

### After (New Combobox)
```tsx
<Combobox
  placeholder="Select contract type"
  value={contractType}
  onChange={setContractType}
  options={[
    { value: 'internal', label: 'Internal Project' },
    { value: 'client', label: 'Client Facing Project' },
  ]}
  clearable={false} // if you don't want clear button
/>
```

## Common Issues & Solutions

### Issue: Combobox closes immediately after opening
**Solution**: Make sure you're not calling `onClick` on parent elements that might close it

### Issue: Search doesn't work
**Solution**: Check that you're using `options` prop, not `loadOptions` (or vice versa)

### Issue: Options list appears behind modal
**Solution**: Combobox uses `z-50`, ensure modal doesn't have higher z-index

### Issue: Async search triggers too many requests
**Solution**: Increase `debounceMs` or set `minSearchLength` higher

## Support

For issues, questions, or feature requests, please contact the development team or create an issue in the project repository.

---

**Last Updated**: December 2024  
**Component Version**: 1.0.0  
**Maintained by**: Invoice Platform Development Team

