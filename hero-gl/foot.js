/* blocul „Hai să vorbim” din footer: pe desktop rămânea mult spațiu gol → câte o poză înclinată în stânga și în dreapta titlului
   (aleasă de client din 3 variante). Pe tabletă / telefon pozele nu apar. Rulează înainte de site.js (SplitText împarte titlul după mutare). */
(() => {
  const cta = document.querySelector('.foot-cta'); if (!cta) return;
  const fig = (img, cls) => `<figure class="fv-img ${cls}"><img src="assets/img/${img}.webp" alt="" loading="lazy"></figure>`;
  const inner = document.createElement('div'); inner.className = 'fv-main';
  while (cta.firstChild) inner.appendChild(cta.firstChild);
  cta.classList.add('fv');
  cta.innerHTML = fig('mm-night', 'l') + '<div class="fv-mid"></div>' + fig('g-bw', 'r');
  cta.querySelector('.fv-mid').appendChild(inner);
})();
