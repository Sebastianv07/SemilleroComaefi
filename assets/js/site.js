/* Punto de entrada: cada página se identifica con <body data-page="...">. */
import { mountLayout, mountBackToTop, watchSections } from './layout.js';
import { eventsPage, newsPage, homePreview } from './novedades.js';
import { contactPage } from './contact.js';

const page = document.body.dataset.page;

mountLayout(page);
mountBackToTop();

if (page === 'inicio') { watchSections(); homePreview(); }
if (page === 'eventos') eventsPage();
if (page === 'noticias') newsPage();
if (page === 'contacto') contactPage();
