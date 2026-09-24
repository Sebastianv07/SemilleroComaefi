/* Cabecera, pie, botón de volver arriba y menú con resaltado de sección. */
import { CONTACT } from './common.js';

/** `spy` = id de sección de la portada que resalta el enlace al desplazarse; `page` = página que lo marca como activo. */
const LINKS = [
    { label: 'Quiénes somos', href: 'index.html#descripcion', spy: 'descripcion' },
    { label: 'Objetivos', href: 'index.html#objetivos', spy: 'objetivos' },
    { label: 'Misión y visión', href: 'index.html#mision', spy: 'mision' },
    { label: 'Noticias', href: 'noticias.html', page: 'noticias' },
    { label: 'Eventos', href: 'eventos.html', page: 'eventos' },
];

// Sección de la portada -> enlace del menú que debe resaltarse.
const SPY_MAP = { descripcion: 'descripcion', objetivos: 'objetivos', objEspecificos: 'objetivos', mision: 'mision', vision: 'mision' };

export function mountLayout(page) {
    const links = LINKS.map((l) => `<li class="nav-item"><a class="nav-link${l.page === page ? ' active' : ''}" href="${l.href}"${l.page === page ? ' aria-current="page"' : ''}${l.spy ? ` data-spy="${l.spy}"` : ''}>${l.label}</a></li>`).join('');

    document.getElementById('site-header').innerHTML = `
      <a class="skip-link" href="#main">Saltar al contenido</a>
      <header class="site-header">
        <nav class="navbar navbar-expand-xl" data-bs-theme="dark" aria-label="Principal"><div class="container">
          <a class="site-brand" href="index.html"><img src="assets/img/comaefi.webp" alt="" width="40" height="40"><span>Semillero de<br>Motricidad</span></a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNav" aria-controls="siteNav" aria-expanded="false" aria-label="Abrir menú">
            <span class="navbar-toggler-icon"></span></button>
          <div class="collapse navbar-collapse" id="siteNav">
            <ul class="navbar-nav me-auto mb-2 mb-xl-0">${links}</ul>
            <a class="btn btn-gold" href="contacto.html"${page === 'contacto' ? ' aria-current="page"' : ''}>Escríbenos</a>
          </div></div></nav>
        <div class="tri-bar"></div>
      </header>`;

    document.getElementById('site-footer').innerHTML = `<footer class="site-footer">
      <div class="tri-bar"></div>
      <div class="container py-5"><div class="row g-4">
        <div class="col-lg-5"><h2>Semillero de Motricidad</h2>
          <p class="mb-0">Grupo de investigación Comunidad de Aprendizaje, Currículo y Didáctica (COMAEFI), de la Facultad de Educación Física, Recreación y Deporte del Politécnico Colombiano Jaime Isaza Cadavid.</p></div>
        <div class="col-sm-6 col-lg-3"><h2>Contacto COMAEFI</h2>
          <address>Bertha Aurora Muñoz Rodríguez<br><a href="mailto:bamunozr@elpoli.edu.co">bamunozr@elpoli.edu.co</a><br>319 79 00 ext. 337</address></div>
        <div class="col-sm-6 col-lg-4"><h2>Contacto del semillero</h2>
          <address>Juan Paulo Marín Castaño<br><a href="mailto:juanmarin@elpoli.edu.co">juanmarin@elpoli.edu.co</a><br>
          <a href="mailto:${CONTACT}">${CONTACT}</a></address></div>
      </div></div>
      <div class="legal"><div class="container py-3">© ${new Date().getFullYear()} <a href="https://www.politecnicojic.edu.co/" rel="noopener">Politécnico Colombiano Jaime Isaza Cadavid</a></div></div>
    </footer>`;
}

/** Botón flotante para volver al inicio de la página; aparece al bajar. */
export function mountBackToTop() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.hidden = true;
    button.setAttribute('aria-label', 'Volver arriba');
    button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 16V4M4.5 9.5 10 4l5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.append(button);

    const update = () => { button.hidden = scrollY < 600; };
    addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => {
        scrollTo({ top: 0 });
        // Quita el ancla (#objetivos, etc.) de la dirección sin recargar ni agregar una entrada al historial.
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        // Lleva también el foco al inicio para quien navega con teclado.
        document.querySelector('.skip-link')?.focus({ preventScroll: true });
        document.activeElement?.blur();
    });
    update();
}

/** En la portada, resalta en el menú la sección que se está leyendo. */
export function watchSections() {
    const links = new Map([...document.querySelectorAll('[data-spy]')].map((a) => [a.dataset.spy, a]));
    if (!links.size || !('IntersectionObserver' in window)) return;

    const setActive = (key) => {
        for (const [k, a] of links) {
            const on = k === key;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
        }
    };
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(SPY_MAP[entry.target.id]);
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (const id of Object.keys(SPY_MAP)) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    }
    // Arriba de todo (portada) no hay ninguna sección activa.
    addEventListener('scroll', () => { if (scrollY < 200) setActive(null); }, { passive: true });
}
