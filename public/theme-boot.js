// Apply the saved theme before the first paint, so there is no flash of the
// wrong theme. Must match src/app/theme.ts and uiPrefs.ts. A file, not an
// inline script, because the security policy forbids inline scripts.
try {
  var theme = JSON.parse(localStorage.getItem('learning-notes:theme'))
  if (theme === 'night' || theme === 'sepia') {
    document.documentElement.dataset.theme = theme
  }
} catch (e) {
  // Storage blocked: Day theme.
}
