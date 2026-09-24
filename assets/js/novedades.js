/* Eventos y noticias: tarjetas, ventana de detalle, filtros, inscripción simulada y vista previa de la portada. */
import { esc, formatDate, isPast, downloadIcs, getEnrollment, saveEnrollment, removeEnrollment, getProfile, wait } from './common.js';

/* ------------------------------ Datos ------------------------------ */

let dataPromise;
function loadData() {
    dataPromise ||= fetch('assets/data/novedades.json').then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
    return dataPromise;
}

const byDateDesc = (a, b) => (b.fecha || '').localeCompare(a.fecha || '');
const byDateAsc = (a, b) => (a.fecha || '').localeCompare(b.fecha || '');

// Lo que hay en pantalla, para abrir detalle e inscripción por posición.
const shown = { eventos: [], noticias: [] };
// Vuelve a pintar las tarjetas de la página actual (p. ej. tras inscribirse).
let refresh = () => {};

const CHECK_ICON = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ------------------------------ Tarjetas ------------------------------ */

function coverHtml(item) {
    return item.imagen
        ? `<img class="cover" src="${esc(item.imagen)}" alt="" loading="lazy" decoding="async">`
        : '<div class="cover cover--empty"><img src="assets/img/comaefi.webp" alt=""></div>';
}

function cardHtml(item, kind, index) {
    // En la portada las tarjetas cuelgan de un h2 de sección; en las listas, del h1 de la página.
    const heading = document.body.dataset.page === 'inicio' ? 'h3' : 'h2';
    const past = isPast(item.fecha);
    const isEvent = kind === 'eventos';

    let cta = '';
    if (isEvent) {
        if (past) cta = '<span class="text-secondary small ms-auto">Evento finalizado</span>';
        else if (getEnrollment(item)) cta = `<span class="badge badge-soft enrolled ms-auto">${CHECK_ICON} Inscrito</span>`;
        else cta = `<button class="btn btn-primary ms-auto" type="button" data-enroll="${kind}:${index}">Inscribirme</button>`;
    }

    return `<div class="col"><article class="item-card">${coverHtml(item)}
      <div class="body">
        <span class="date-chip${past && isEvent ? ' past' : ''}">${esc(formatDate(item.fecha))}</span>
        <${heading}>${esc(item.nombre)}</${heading}>
        <p class="desc">${esc(item.descripcion)}</p>
        ${item.hora || item.lugar ? `<ul class="facts">
          ${item.hora ? `<li><b>Hora:</b> ${esc(item.hora)}</li>` : ''}
          ${item.lugar ? `<li><b>Lugar:</b> ${esc(item.lugar)}</li>` : ''}</ul>` : ''}
        <div class="actions d-flex align-items-center gap-2">
          <button class="btn btn-link px-0" type="button" data-detail="${kind}:${index}">${isEvent ? 'Ver detalle' : 'Leer más'}<span class="visually-hidden">: ${esc(item.nombre)}</span></button>
          ${cta}
        </div>
      </div></article></div>`;
}

function renderCards(container, items, kind) {
    shown[kind] = items;
    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">${items.map((item, i) => cardHtml(item, kind, i)).join('')}</div>`;
}

const stateBox = (title, text) => `<div class="state-box"><h2>${title}</h2><p class="mb-0">${text}</p></div>`;

const loadError = () => `<div class="state-box" role="alert"><h2>No pudimos cargar la información</h2>
  <p class="mb-0">Si abriste el archivo directamente, sírvelo con un servidor local (por ejemplo, <code>npm start</code>) para que pueda leer <code>assets/data/novedades.json</code>.</p></div>`;

/* ------------------------------ Ventanas (modales) ------------------------------ */

const modalOf = (el) => bootstrap.Modal.getOrCreateInstance(el);

/** Abre `target`; si ya hay otra ventana abierta, la cierra primero para no apilarlas. */
function switchTo(target) {
    const open = document.querySelector('.modal.show');
    if (!open || open === target) {
        modalOf(target).show();
        return;
    }
    open.addEventListener('hidden.bs.modal', () => modalOf(target).show(), { once: true });
    modalOf(open).hide();
}

function ensureModal(id, html) {
    let el = document.getElementById(id);
    if (!el) {
        document.body.insertAdjacentHTML('beforeend', html);
        el = document.getElementById(id);
    }
    return el;
}

const itemAt = (ref) => {
    const [kind, index] = ref.split(':');
    return { kind, index: Number(index), item: shown[kind]?.[Number(index)] };
};

/* ------------------------------ Detalle ------------------------------ */

function openDetail(ref) {
    const { kind, item } = itemAt(ref);
    if (!item) return;
    const el = ensureModal('detailModal', `
      <div class="modal fade" id="detailModal" tabindex="-1" aria-labelledby="detailTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"><div class="modal-content">
          <div class="modal-header"><h2 class="modal-title fs-4" id="detailTitle"></h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
          <div class="modal-body" data-body></div>
          <div class="modal-footer" data-footer></div>
        </div></div>
      </div>`);
    const past = isPast(item.fecha);
    const isEvent = kind === 'eventos';
    const enrolled = isEvent && getEnrollment(item);

    el.querySelector('#detailTitle').textContent = item.nombre;
    el.querySelector('[data-body]').innerHTML = `
      ${item.imagen ? `<img class="detail-cover" src="${esc(item.imagen)}" alt="">` : ''}
      <p class="mb-2"><span class="date-chip${past && isEvent ? ' past' : ''}">${esc(formatDate(item.fecha))}</span></p>
      ${item.hora || item.lugar ? `<ul class="facts mb-3">
        ${item.hora ? `<li><b>Hora:</b> ${esc(item.hora)}</li>` : ''}${item.lugar ? `<li><b>Lugar:</b> ${esc(item.lugar)}</li>` : ''}</ul>` : ''}
      ${String(item.descripcion).split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}`;

    let footer = '<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>';
    if (isEvent && !past) {
        footer = enrolled
            ? `<span class="enrolled-note me-auto">${CHECK_ICON} Ya estás inscrito</span>
               <button type="button" class="btn btn-link text-danger" data-cancel>Cancelar inscripción</button>
               <button type="button" class="btn btn-outline-primary" data-ics>Agregar al calendario</button>
               <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>`
            : `<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
               <button type="button" class="btn btn-outline-primary" data-ics>Agregar al calendario</button>
               <button type="button" class="btn btn-primary" data-enroll="${ref}">Inscribirme</button>`;
    }
    el.querySelector('[data-footer]').innerHTML = footer;
    el.querySelector('[data-ics]')?.addEventListener('click', () => downloadIcs(item));
    el.querySelector('[data-cancel]')?.addEventListener('click', () => {
        removeEnrollment(item);
        modalOf(el).hide();
        refresh();
    });
    switchTo(el);
}

/* ------------------------------ Inscripción (simulada) ------------------------------ */

function openEnroll(ref) {
    const { item } = itemAt(ref);
    if (!item) return;
    const el = ensureModal('enrollModal', `
      <div class="modal fade" id="enrollModal" tabindex="-1" aria-labelledby="enrollTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered"><div class="modal-content" data-content></div></div>
      </div>`);
    const profile = getProfile();
    const content = el.querySelector('[data-content]');

    content.innerHTML = `<form novalidate>
      <div class="modal-header"><h2 class="modal-title fs-4" id="enrollTitle">Inscribirme al evento</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
      <div class="modal-body">
        <p class="enroll-event"><b>${esc(item.nombre)}</b><br><span class="text-secondary">${esc(formatDate(item.fecha))}${item.hora ? ` · ${esc(item.hora)}` : ''}${item.lugar ? ` · ${esc(item.lugar)}` : ''}</span></p>
        <div class="mb-3"><label class="form-label" for="enrollName">Nombre completo</label>
          <input class="form-control" id="enrollName" name="nombre" autocomplete="name" maxlength="80" pattern="[\\p{L}][\\p{L}\\s'.\\-]*" required value="${esc(profile.nombre || '')}">
          <div class="invalid-feedback">Escribe tu nombre (solo letras).</div></div>
        <div class="mb-3"><label class="form-label" for="enrollEmail">Correo electrónico</label>
          <input class="form-control" id="enrollEmail" name="correo" type="email" autocomplete="email" maxlength="120" required value="${esc(profile.correo || '')}">
          <div class="form-text">Ahí te enviaremos la invitación.</div>
          <div class="invalid-feedback">Escribe un correo válido, por ejemplo nombre@correo.com.</div></div>
        <p class="demo-note mb-0">Sitio de demostración: no se envía ningún correo ni se guardan tus datos en un servidor.</p>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Confirmar inscripción</button></div>
    </form>`;

    const form = content.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            form.querySelector(':invalid').focus();
            return;
        }
        const person = { nombre: form.nombre.value.trim(), correo: form.correo.value.trim() };
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        submit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Inscribiendo…';
        await wait(900);

        saveEnrollment(item, person);
        refresh();
        content.innerHTML = `
          <div class="modal-header"><h2 class="modal-title fs-4" id="enrollTitle">Inscripción confirmada</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
          <div class="modal-body text-center py-4" role="status">
            <div class="success-mark">${CHECK_ICON.replace('width="16" height="16"', 'width="30" height="30"')}</div>
            <p class="fs-5 fw-semibold mb-2">Se ha inscrito a este evento con éxito.</p>
            <p class="mb-3">${esc(person.nombre)}, recibirá la invitación a <b>${esc(person.correo)}</b>.</p>
            <p class="enroll-event mb-3"><b>${esc(item.nombre)}</b><br><span class="text-secondary">${esc(formatDate(item.fecha))}${item.hora ? ` · ${esc(item.hora)}` : ''}</span></p>
            <p class="demo-note mb-0">Sitio de demostración: no se envió ningún correo real.</p>
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-outline-primary" data-ics>Agregar al calendario</button>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Listo</button></div>`;
        content.querySelector('[data-ics]').addEventListener('click', () => downloadIcs(item));
    });

    el.addEventListener('shown.bs.modal', () => el.querySelector('input')?.focus(), { once: true });
    switchTo(el);
}

document.addEventListener('click', (e) => {
    const detail = e.target.closest('[data-detail]');
    if (detail) return openDetail(detail.dataset.detail);
    const enroll = e.target.closest('[data-enroll]');
    if (enroll) openEnroll(enroll.dataset.enroll);
});

/* ------------------------------ Páginas ------------------------------ */

export async function eventsPage() {
    const list = document.getElementById('list');
    const filters = document.getElementById('filters');
    let events;
    try {
        events = (await loadData()).eventos || [];
    } catch {
        list.innerHTML = loadError();
        return;
    }
    if (!events.length) {
        list.innerHTML = stateBox('Todavía no hay eventos publicados', 'Cuando el semillero programe uno lo verás aquí.');
        return;
    }

    const upcoming = events.filter((e) => !isPast(e.fecha)).sort(byDateAsc);
    const past = events.filter((e) => isPast(e.fecha)).sort(byDateDesc);
    const views = {
        proximos: { label: 'Próximos', items: upcoming, empty: ['No hay eventos próximos', 'Revisa los eventos pasados o escríbenos para saber qué se está preparando.'] },
        pasados: { label: 'Pasados', items: past, empty: ['Aún no hay eventos pasados', 'Los eventos que ya ocurrieron aparecerán aquí.'] },
        todos: { label: 'Todos', items: [...events].sort(byDateDesc), empty: ['Sin eventos', ''] },
    };

    let current = upcoming.length ? 'proximos' : 'todos';
    const show = () => {
        const view = views[current];
        if (view.items.length) renderCards(list, view.items, 'eventos');
        else list.innerHTML = stateBox(...view.empty);
    };
    refresh = show;

    filters.innerHTML = `<div class="btn-group" role="group" aria-label="Filtrar eventos">
      ${Object.entries(views).map(([key, v]) => `<input type="radio" class="btn-check" name="filter" id="f-${key}" value="${key}"${key === current ? ' checked' : ''}>
        <label class="btn btn-outline-primary" for="f-${key}">${v.label} <span class="count">${v.items.length}</span></label>`).join('')}</div>`;
    filters.addEventListener('change', (e) => { current = e.target.value; show(); });
    show();
}

export async function newsPage() {
    const list = document.getElementById('list');
    try {
        const news = ((await loadData()).noticias || []).sort(byDateDesc);
        if (news.length) renderCards(list, news, 'noticias');
        else list.innerHTML = stateBox('Todavía no hay noticias publicadas', 'Vuelve pronto: aquí compartimos lo que hace el semillero.');
    } catch {
        list.innerHTML = loadError();
    }
}

/** Portada: próximos eventos y últimas noticias; si no hay nada que mostrar, la sección queda oculta. */
export async function homePreview() {
    let data;
    try {
        data = await loadData();
    } catch {
        return;
    }
    const render = () => {
        const upcoming = (data.eventos || []).filter((e) => !isPast(e.fecha)).sort(byDateAsc).slice(0, 3);
        const news = [...(data.noticias || [])].sort(byDateDesc).slice(0, 3);
        for (const [id, items, kind] of [['home-events', upcoming, 'eventos'], ['home-news', news, 'noticias']]) {
            const section = document.getElementById(id);
            if (!section || !items.length) continue;
            renderCards(section.querySelector('[data-cards]'), items, kind);
            section.hidden = false;
        }
    };
    render();
    refresh = render;

    // Las secciones nuevas empujan el contenido hacia abajo: si se llegó con un ancla (#objetivos), se vuelve a ella.
    if (location.hash && performance.now() < 4000) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
