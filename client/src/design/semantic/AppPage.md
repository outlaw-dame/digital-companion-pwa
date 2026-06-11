# AppPage

## Purpose
Page-level container for each route/view in the application. Wraps Framework7's `<Page>` component with consistent behavior and platform-specific styling.

## Usage

```vue
<AppPage name="home" ptr @refresh="handleRefresh">
  <AppNavbar title="Home" />
  <!-- Page content -->
</AppPage>
```

## Do
- Use as wrapper for each route view component
- Use `name` prop for Framework7 navigation integration
- Enable `ptr` prop for pull-to-refresh capable pages
- Use with AppNavbar for consistent navigation

## Do Not
- Nest AppPage within AppPage
- Use raw Framework7 `<Page>` component
- Create custom page containers
- Add excessive padding/margins (handled by component)

## Accessibility Rules
- Each page should have a unique, descriptive `name` prop for screen readers
- Pages should have at most one AppNavbar
- Ensure focus management when pages change

## Platform Behavior
- **iOS**: Uses iOS-style page transitions
- **Android/Material**: Uses Material Design page transitions
- **PWA**: Uses platform-appropriate transitions
- Pull-to-refresh is automatically enabled on touch devices

## Example

```vue
<!-- In a route view -->
<template>
  <AppPage name="explore" ptr @refresh="loadData">
    <AppNavbar title="Explore" back-link="Back" />
    
    <AppSearchBar @search="handleSearch" />
    
    <AppList>
      <AppListItem v-for="item in items" :key="item.id" :title="item.title" />
    </AppList>
  </AppPage>
</template>
```

## Test Expectations
- Renders children correctly
- Fires `refresh` event when pull-to-refresh is triggered
- Passes `name` prop to Framework7 Page
- Handles back button navigation properly
- Respects reduced motion preference
