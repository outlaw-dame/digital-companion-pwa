# AppSearchBar

**Component:** `AppSearchBar.vue`  
**Type:** Semantic Primitive  
**Category:** Form Component  
**Replaces:** Raw Framework7 `<Searchbar>`

---

## Purpose

Search input field with native-like behavior across iOS, Android, and PWA.

---

## Usage

### Basic Usage

```vue
<template>
  <AppSearchBar v-model="searchQuery" @search="handleSearch" />
</template>

<script setup>
import { ref } from 'vue';
import AppSearchBar from '@/design/semantic/AppSearchBar.vue';

const searchQuery = ref('');

const handleSearch = (value: string) => {
  // Perform search
  console.log('Searching for:', value);
};
</script>
```

### With Placeholder

```vue
<AppSearchBar 
  v-model="searchQuery"
  placeholder="Search users..."
  @search="handleSearch"
/>
```

### With Clear Button

```vue
<AppSearchBar 
  v-model="searchQuery"
  :clear="true"
  @search="handleSearch"
  @clear="handleClear"
/>
```

### Custom Search Handler

```vue
<AppSearchBar 
  v-model="searchQuery"
  :custom-search="true"
  @search="handleCustomSearch"
/>
```

### Debounced Search

```vue
<AppSearchBar 
  v-model="searchQuery"
  :debounce="500"
  @search="handleSearch"
/>
```

---

## Do / Do Not

### Do ✅

- **use native search input semantics**
  ```vue
  <AppSearchBar type="search" /> <!-- Built-in -->
  ```

- **pass localized label**
  ```vue
  <AppSearchBar placeholder="Search..." />
  ```

- **use enterkeyhint="search"**
  ```vue
  <AppSearchBar /> <!-- Built-in -->
  ```

- **handle search events**
  ```vue
  <AppSearchBar @search="handleSearch" />
  ```

- **use v-model for two-way binding**
  ```vue
  <AppSearchBar v-model="searchQuery" />
  ```

### Don't ❌

- **create custom search inputs in route views**
  ```vue
  <!-- ❌ BAD -->
  <input type="text" @input="handleSearch" />
  
  <!-- ✅ GOOD -->
  <AppSearchBar v-model="query" @search="handleSearch" />
  ```

- **use contenteditable**
  ```vue
  <!-- ❌ BAD -->
  <div contenteditable @input="handleSearch" />
  ```

- **suppress native keyboard behavior**
  ```vue
  <!-- ❌ BAD -->
  <AppSearchBar @keydown.prevent="handleKey" />
  
  <!-- ✅ GOOD -->
  <AppSearchBar @keydown="handleKey" />
  ```

- **disable spellcheck inappropriately**
  ```vue
  <!-- ❌ BAD - spellcheck is already false -->
  <AppSearchBar spellcheck="false" />
  
  <!-- ✅ GOOD - spellcheck="false" is built-in -->
  <AppSearchBar />
  ```

---

## Accessibility Rules

### Non-Negotiable

1. **Must have accessible label**
   - Uses `aria-label` with placeholder text
   - Falls back to 'Search' if no placeholder

2. **Must use semantic search type**
   - `type="search"` (built-in)

3. **Must provide input hints**
   - `inputmode="search"` (built-in)
   - `enterkeyhint="search"` (built-in)
   - `autocapitalize="none"` (built-in)

4. **Must disable spellcheck**
   - `spellcheck="false"` (built-in)

5. **Must be keyboard accessible**
   - Focusable via Tab key
   - Submittable via Enter key
   - Clearable via Escape key (when clear button enabled)

6. **Must have proper role**
   - Wrapped in `<form role="search">`

### Testing

Verify with:
- VoiceOver (iOS): Announces as search field
- TalkBack (Android): Announces as search field
- Keyboard only: Can focus, type, submit, clear
- Screen reader: Reads placeholder/label

---

## Platform Behavior

### iOS

- Uses iOS-style search field
- Native search keyboard
- Clear button in input
- Search icon in input

### Android

- Uses Material-style search field
- Native search keyboard
- Clear button in input
- Search icon in input

### PWA

- Uses browser-native search styling
- Native search keyboard
- Clear button in input
- Search icon in input

### Common Behavior

All platforms:
- Support v-model binding
- Emit search event on Enter
- Support clear button
- Support debounced search
- Respect disabled/readonly states

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `'Search'` | Placeholder text and accessible label |
| `value` | `string` | `''` | Current search value (v-model) |
| `disabled` | `boolean` | `false` | Disable the search input |
| `readonly` | `boolean` | `false` | Make the search input read-only |
| `clear` | `boolean` | `true` | Show clear button |
| `customSearch` | `boolean` | `false` | Use custom search handler (disables debounce) |
| `debounce` | `number` | `300` | Debounce time in milliseconds for search event |

---

## Events

| Event | Arguments | Description |
|-------|-----------|-------------|
| `update:value` | `value: string` | Emitted when input value changes |
| `search` | `value: string` | Emitted when search is triggered (Enter or debounce) |
| `clear` | - | Emitted when clear button is clicked |
| `focus` | - | Emitted when input receives focus |
| `blur` | - | Emitted when input loses focus |
| `keydown` | `event: KeyboardEvent` | Emitted on keydown events |

---

## Slots

This component does not expose slots. Use props for customization.

---

## Example

### Complete Search Implementation

```vue
<template>
  <AppPage>
    <AppNavbar title="Search" />
    
    <AppSearchBar 
      v-model="searchQuery"
      placeholder="Search messages..."
      :clear="true"
      :debounce="300"
      @search="performSearch"
      @clear="clearSearch"
    />
    
    <!-- Search results -->
    <AppList v-if="results.length > 0">
      <AppListItem 
        v-for="result in results" 
        :key="result.id"
        :title="result.title"
      />
    </AppList>
    
    <p v-else-if="searchQuery">No results found</p>
    <p v-else>Enter a search term</p>
  </AppPage>
</template>

<script setup>
import { ref, watch } from 'vue';
import AppPage from '@/design/semantic/AppPage.vue';
import AppNavbar from '@/design/semantic/AppNavbar.vue';
import AppSearchBar from '@/design/semantic/AppSearchBar.vue';
import AppList from '@/design/semantic/AppList.vue';
import AppListItem from '@/design/semantic/AppListItem.vue';

const searchQuery = ref('');
const results = ref([]);

const performSearch = async (query: string) => {
  if (!query.trim()) return;
  
  // Perform API search
  const response = await api.search(query);
  results.value = response.data;
};

const clearSearch = () => {
  searchQuery.value = '';
  results.value = [];
};

// Optional: Watch for query changes
watch(searchQuery, (newQuery) => {
  if (!newQuery) {
    results.value = [];
  }
});
</script>
```

---

## Test Expectations

### Unit Tests

```typescript
// tests/unit/design/semantic/AppSearchBar.spec.ts

import { mount } from '@vue/test-utils';
import AppSearchBar from '@/design/semantic/AppSearchBar.vue';

describe('AppSearchBar', () => {
  it('renders with default placeholder', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('placeholder')).toBe('Search');
  });

  it('renders with custom placeholder', () => {
    const wrapper = mount(AppSearchBar, {
      props: { placeholder: 'Find...' },
    });
    expect(wrapper.find('input').attributes('placeholder')).toBe('Find...');
  });

  it('has type="search"', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('type')).toBe('search');
  });

  it('has inputmode="search"', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('inputmode')).toBe('search');
  });

  it('has enterkeyhint="search"', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('enterkeyhint')).toBe('search');
  });

  it('has autocapitalize="none"', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('autocapitalize')).toBe('none');
  });

  it('has spellcheck="false"', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('spellcheck')).toBe('false');
  });

  it('has accessible label', () => {
    const wrapper = mount(AppSearchBar);
    expect(wrapper.find('input').attributes('aria-label')).toBe('Search');
  });

  it('emits update:value on input', async () => {
    const wrapper = mount(AppSearchBar);
    const input = wrapper.find('input');
    await input.setValue('test');
    expect(wrapper.emitted('update:value')).toBeTruthy();
    expect(wrapper.emitted('update:value')?.[0]).toEqual(['test']);
  });

  it('emits search on Enter', async () => {
    const wrapper = mount(AppSearchBar);
    const input = wrapper.find('input');
    await input.setValue('test');
    await input.trigger('keydown.enter');
    expect(wrapper.emitted('search')).toBeTruthy();
    expect(wrapper.emitted('search')?.[0]).toEqual(['test']);
  });

  it('emits clear when clear button clicked', async () => {
    const wrapper = mount(AppSearchBar, {
      props: { value: 'test', clear: true },
    });
    await wrapper.find('.searchbar-clear').trigger('click');
    expect(wrapper.emitted('clear')).toBeTruthy();
  });

  it('respects disabled prop', () => {
    const wrapper = mount(AppSearchBar, {
      props: { disabled: true },
    });
    expect(wrapper.find('input').attributes('disabled')).toBe('');
  });

  it('respects readonly prop', () => {
    const wrapper = mount(AppSearchBar, {
      props: { readonly: true },
    });
    expect(wrapper.find('input').attributes('readonly')).toBe('');
  });
});
```

### Expected Assertions

All tests must verify:
1. ✅ `type="search"` is set
2. ✅ `inputmode="search"` is set
3. ✅ `enterkeyhint="search"` is set
4. ✅ `autocapitalize="none"` is set
5. ✅ `spellcheck="false"` is set
6. ✅ Accessible label is present
7. ✅ Search event is emitted on Enter
8. ✅ Clear event is emitted when clear button clicked
9. ✅ Value updates correctly via v-model
10. ✅ Disabled state prevents interaction
11. ✅ Readonly state prevents editing

---

## Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **Custom search handler** | May miss some native search events | Use v-model with watch for full control |
| **Debounce timing** | Not perfectly aligned with native search | Adjust debounce prop as needed |
| **Platform-specific styling** | May differ from native OS search | Use platform-appropriate props |

---

## See Also

- [Frontend Architecture Contract](../../../docs/internal/frontend-architecture-contract.md)
- [Frontend Semantic Component Checklist](../../../docs/internal/frontend-semantic-component-checklist.md)
- [AppIcon Component](AppIcon.vue)
- [AppPage Component](AppPage.vue)
