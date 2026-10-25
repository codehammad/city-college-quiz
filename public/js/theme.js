(() => {
  const buttons = document.querySelectorAll('.theme-toggle');
  const savedTheme = document.documentElement.dataset.theme || 'light';

  function showTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(isDark));
      button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      button.innerHTML = `<i class="fa-regular ${isDark ? 'fa-sun' : 'fa-moon'}"></i><span>${isDark ? 'Light mode' : 'Dark mode'}</span>`;
    });
  }

  showTheme(savedTheme);
  buttons.forEach((button) => button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    showTheme(nextTheme);
    try { localStorage.setItem('city-quiz-theme', nextTheme); } catch (error) { /* Theme still applies for this page. */ }
  }));
})();
