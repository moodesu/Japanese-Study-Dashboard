try {
  document.documentElement.dataset.theme = localStorage.getItem('studyTheme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch (error) {
  document.documentElement.dataset.theme = 'light';
}
