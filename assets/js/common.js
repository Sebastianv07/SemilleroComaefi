/* Utilidades compartidas: escapado de HTML, fechas, calendario (.ics) y datos guardados en el navegador. */

export const CONTACT = 'semilleromotricidad@elpoli.edu.co';

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------ Fechas ------------------------------ */

const dateFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
export const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-14" -> Date local, sin desfases de zona horaria. */
export function parseDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
export const formatDate = (iso) => (parseDate(iso) ? dateFormat.format(parseDate(iso)) : 'Fecha por confirmar');
export const isPast = (iso) => (parseDate(iso) ? parseDate(iso).getTime() + DAY_MS <= Date.now() : false);

/* ------------------------------ Calendario (.ics) ------------------------------ */

/** Texto de un evento en formato iCalendar para agregarlo al calendario personal. */
export function buildIcs(item) {
    const text = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const pad = (n) => String(n).padStart(2, '0');
    const day = item.fecha.replaceAll('-', '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

    let when;
    const time = /^(\d{2}):(\d{2})$/.exec(item.hora || '');
    if (time) {
        const start = parseDate(item.fecha);
        start.setHours(Number(time[1]), Number(time[2]));
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
        when = [`DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`];
    } else {
        const next = new Date(parseDate(item.fecha).getTime() + DAY_MS);
        when = [`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`];
    }

    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Semillero de Motricidad//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        `UID:${day}-${encodeURIComponent(item.nombre).slice(0, 40)}@semillero-motricidad`, `DTSTAMP:${stamp}`, ...when,
        `SUMMARY:${text(item.nombre)}`, `LOCATION:${text(item.lugar)}`, `DESCRIPTION:${text(item.descripcion)}`,
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

export function downloadIcs(item) {
    const blob = new Blob([buildIcs(item)], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${item.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
}

/* ------------------------------ Inscripciones simuladas ------------------------------ */
// No hay servidor: las inscripciones solo se recuerdan en este navegador para mostrar "Inscrito".

const ENROLLMENTS = 'semillero.inscripciones';
const PROFILE = 'semillero.perfil';

function read(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}
function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Almacenamiento bloqueado (modo privado): la confirmación se muestra igual, solo que no se recuerda.
    }
}

const enrollKey = (item) => `${item.fecha}|${item.nombre}`;
export const getEnrollment = (item) => read(ENROLLMENTS, {})[enrollKey(item)] || null;
export const getProfile = () => read(PROFILE, {});

export function saveEnrollment(item, person) {
    write(ENROLLMENTS, { ...read(ENROLLMENTS, {}), [enrollKey(item)]: person });
    write(PROFILE, person);
}

export function removeEnrollment(item) {
    const all = read(ENROLLMENTS, {});
    delete all[enrollKey(item)];
    write(ENROLLMENTS, all);
}

/** Pausa breve para simular el envío. */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
