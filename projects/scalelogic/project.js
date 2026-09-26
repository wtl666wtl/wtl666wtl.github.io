(() => {
  const dialog = document.querySelector('#figure-dialog');
  let figureTrigger;
  document.querySelectorAll('[data-lightbox]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    figureTrigger = link;
    const image = document.querySelector('#expanded-figure');
    image.src = link.href; image.alt = link.querySelector('img').alt;
    document.querySelector('#expanded-caption').textContent = link.dataset.caption;
    dialog.showModal();
  }));
  document.querySelector('#close-figure').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => figureTrigger?.focus({preventScroll: true}));

  document.querySelector('#copy-bibtex').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    const bibtex = document.querySelector('#bibtex');
    try {
      await navigator.clipboard.writeText(bibtex.textContent);
      status.textContent = 'BibTeX copied to clipboard.';
    } catch {
      const range = document.createRange(); range.selectNodeContents(bibtex);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      status.textContent = 'Citation selected. Press Ctrl+C (or Command+C) to copy.';
    }
  });

  const navigation = [...document.querySelectorAll('.section-links a')];
  const sections = navigation.map(link => document.querySelector(link.hash));
  let scheduled = false;
  const update = () => {
    scheduled = false;
    let current = -1;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= 140) current = index; });
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) current = sections.length - 1;
    navigation.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, {passive: true});
  window.addEventListener('resize', update);
  update();
})();
