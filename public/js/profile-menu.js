document.addEventListener('DOMContentLoaded', () => {
  const bar = document.querySelector('.topbar');
  const avatar = bar?.querySelector('.avatar');
  const label = bar?.querySelector('.admin-label');
  if (!bar || !avatar || !label) return;

  const holder = document.createElement('div');
  holder.className = 'profile-control';
  const button = document.createElement('button');
  button.className = 'profile-trigger';
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open profile menu');
  button.append(avatar, label);
  const arrow = document.createElement('i');
  arrow.className = 'fa-solid fa-chevron-down profile-arrow';
  button.appendChild(arrow);

  const menu = document.createElement('div');
  menu.className = 'profile-dropdown';
  menu.hidden = true;
  const settings = document.createElement('a');
  settings.href = '/settings';
  settings.innerHTML = '<i class="fa-solid fa-gear"></i><span>Settings</span>';
  const form = document.createElement('form');
  form.method = 'post';
  form.action = '/logout';
  const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
  form.innerHTML = `<input type="hidden" name="_csrf" value="${token}">`;
  const logout = document.createElement('button');
  logout.type = 'submit';
  logout.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i><span>Log out</span>';
  form.appendChild(logout);
  menu.append(settings, form);
  holder.append(button, menu);
  bar.appendChild(holder);

  button.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (!holder.contains(event.target)) {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }
  });
});
