/* Formulario de contacto (PQRS y otros asuntos). Es una demostración: no envía los datos a ningún lado. */
import { esc, wait } from './common.js';

// value = lo que se elige (y se puede pasar como ?asunto=queja); prefix = letra del número de radicado.
const SUBJECTS = {
    PQRS: [
        { value: 'peticion', noun: 'petición', label: 'Petición', prefix: 'P', help: 'Solicitas información o que el semillero haga algo por ti.' },
        { value: 'queja', noun: 'queja', label: 'Queja', prefix: 'Q', help: 'Te incomodó la actuación de una persona o del semillero.' },
        { value: 'reclamo', noun: 'reclamo', label: 'Reclamo', prefix: 'R', help: 'Algo que esperabas no se cumplió o se hizo mal.' },
        { value: 'sugerencia', noun: 'sugerencia', label: 'Sugerencia', prefix: 'S', help: 'Tienes una idea para mejorar lo que hacemos.' },
    ],
    Otros: [
        { value: 'felicitacion', noun: 'felicitación', label: 'Felicitación', prefix: 'F', help: 'Quieres reconocer una actividad o a una persona del semillero.' },
        { value: 'informacion', noun: 'solicitud de información', label: 'Información sobre el semillero', prefix: 'I', help: 'Quieres saber cómo participar, horarios o actividades.' },
        { value: 'alianza', noun: 'propuesta de colaboración', label: 'Propuesta de alianza o colaboración', prefix: 'A', help: 'Representas a una institución u organización y quieres trabajar con nosotros.' },
    ],
};
const ALL = Object.values(SUBJECTS).flat();
const MAX_MESSAGE = 1000;

const optionsHtml = () => Object.entries(SUBJECTS).map(([group, items]) =>
    `<optgroup label="${esc(group)}">${items.map((s) => `<option value="${s.value}">${esc(s.label)}</option>`).join('')}</optgroup>`).join('');

const formHtml = () => `
  <form novalidate id="contactForm">
    <div class="mb-3"><label class="form-label" for="cSubject">Asunto</label>
      <select class="form-select" id="cSubject" name="asunto" required>
        <option value="">Selecciona un asunto…</option>${optionsHtml()}
      </select>
      <div class="form-text" id="cSubjectHelp" aria-live="polite">Elige el tipo de solicitud que quieres hacer.</div>
      <div class="invalid-feedback">Selecciona un asunto.</div></div>

    <div class="row g-3 mb-3">
      <div class="col-md-6"><label class="form-label" for="cName">Nombre completo</label>
        <input class="form-control" id="cName" name="nombre" autocomplete="name" maxlength="80" pattern="[\\p{L}][\\p{L}\\s'.\\-]*" required>
        <div class="invalid-feedback">Escribe tu nombre (solo letras).</div></div>
      <div class="col-md-6"><label class="form-label" for="cEmail">Correo electrónico</label>
        <input class="form-control" id="cEmail" name="correo" type="email" autocomplete="email" maxlength="120" required>
        <div class="invalid-feedback">Escribe un correo válido, por ejemplo nombre@correo.com.</div></div>
    </div>

    <div class="mb-3"><label class="form-label" for="cPhone">Teléfono <span class="text-secondary fw-normal">(opcional)</span></label>
      <input class="form-control" id="cPhone" name="telefono" type="tel" inputmode="tel" autocomplete="tel" maxlength="15" pattern="\\d{7,15}">
      <div class="invalid-feedback">Solo números, entre 7 y 15 dígitos.</div></div>

    <div class="mb-3"><label class="form-label" for="cMessage">Mensaje</label>
      <textarea class="form-control" id="cMessage" name="mensaje" rows="6" minlength="20" maxlength="${MAX_MESSAGE}" required></textarea>
      <div class="invalid-feedback">Cuéntanos con al menos 20 caracteres.</div>
      <div class="form-text text-end" id="cCount">0 / ${MAX_MESSAGE}</div></div>

    <div class="form-check mb-4">
      <input class="form-check-input" type="checkbox" id="cConsent" name="acepto" required>
      <label class="form-check-label" for="cConsent">Autorizo el tratamiento de mis datos personales para responder esta solicitud (Ley 1581 de 2012).</label>
      <div class="invalid-feedback">Debes autorizar el tratamiento de tus datos para poder enviar el mensaje.</div></div>

    <div class="d-flex flex-wrap align-items-center gap-3">
      <button class="btn btn-primary btn-lg" type="submit">Enviar mensaje</button>
      <p class="demo-note mb-0">Sitio de demostración: el mensaje no se envía ni se guarda.</p>
    </div>
  </form>`;

const successHtml = ({ subject, name, email, ticket }) => `
  <div class="contact-success" role="status">
    <div class="success-mark"><svg width="30" height="30" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <h2 class="h3" tabindex="-1" id="successTitle">Recibimos tu ${esc(subject.noun)}</h2>
    <p class="mb-3">${esc(name)}, te responderemos al correo <b>${esc(email)}</b>.</p>
    <p class="ticket mb-4"><span class="text-secondary">Número de radicado</span><br><strong>${esc(ticket)}</strong></p>
    <p class="demo-note">Sitio de demostración: este número es de ejemplo y no se envió ningún correo real.</p>
    <button class="btn btn-outline-primary" type="button" data-again>Enviar otro mensaje</button>
  </div>`;

/** Número de radicado de ejemplo: letra del asunto + año + 5 dígitos. */
const makeTicket = (subject) => `${subject.prefix}-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;

export function contactPage() {
    const panel = document.getElementById('contactPanel');

    function showForm() {
        panel.innerHTML = formHtml();
        const form = panel.querySelector('form');
        const select = form.asunto;
        const help = form.querySelector('#cSubjectHelp');
        const counter = form.querySelector('#cCount');

        const pre = new URLSearchParams(location.search).get('asunto');
        if (ALL.some((s) => s.value === pre)) select.value = pre;

        const updateHelp = () => {
            help.textContent = ALL.find((s) => s.value === select.value)?.help || 'Elige el tipo de solicitud que quieres hacer.';
        };
        select.addEventListener('change', updateHelp);
        updateHelp();
        form.mensaje.addEventListener('input', () => { counter.textContent = `${form.mensaje.value.length} / ${MAX_MESSAGE}`; });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            form.classList.add('was-validated');
            if (!form.checkValidity()) {
                form.querySelector(':invalid').focus();
                return;
            }
            const submit = form.querySelector('[type=submit]');
            submit.disabled = true;
            submit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enviando…';
            await wait(1100);

            const subject = ALL.find((s) => s.value === select.value);
            panel.innerHTML = successHtml({ subject, name: form.nombre.value.trim(), email: form.correo.value.trim(), ticket: makeTicket(subject) });
            panel.querySelector('#successTitle').focus();
            panel.querySelector('[data-again]').addEventListener('click', () => { showForm(); panel.querySelector('select').focus(); });
        });
    }

    showForm();
}
