(() => {
  const form = document.getElementById('profilePhotoForm');
  if (!form) return;

  const input = form.querySelector('input[type="file"]');
  const preview = document.getElementById('photoPreview');
  const message = document.getElementById('photoMessage');
  const button = document.getElementById('photoUploadButton');

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      message.textContent = 'Image must be 4 MB or smaller.';
      message.className = 'profile-photo-message error';
      input.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.textContent = 'Choose a JPG, PNG, or WebP image.';
      message.className = 'profile-photo-message error';
      input.value = '';
      return;
    }
    const image = document.createElement('img');
    image.alt = 'Selected profile photo preview';
    image.src = URL.createObjectURL(file);
    preview.replaceChildren(image);
    message.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!input.files.length) return;
    button.disabled = true;
    message.textContent = 'Saving photo…';
    message.className = 'profile-photo-message';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'X-CSRF-Token': form.querySelector('[name="_csrf"]').value }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'Photo upload failed.');
      window.location.reload();
    } catch (error) {
      message.textContent = error.message || 'Could not save your photo. Please try again.';
      message.className = 'profile-photo-message error';
      button.disabled = false;
    }
  });
})();
