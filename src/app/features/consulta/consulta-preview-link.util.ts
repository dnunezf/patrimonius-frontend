/**
 * Los índices del documento (Word/HTML) suelen usar <a href="#id"> o <a href="/#id">.
 * En una SPA eso dispara el router o lleva al inicio. Aquí se desplaza solo dentro del modal.
 */
export function onConsultaPreviewLinkClick(ev: MouseEvent): void {
  const t = ev.target as HTMLElement | null;
  const a = t?.closest?.('a');
  if (!a || !(a instanceof HTMLAnchorElement)) return;

  const hrefAttr = a.getAttribute('href');
  if (hrefAttr === null) return;

  const href = hrefAttr.trim();
  const lower = href.toLowerCase();
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return;

  const scope =
    (a.closest('.consulta-preview-scroll') as HTMLElement | null) ??
    (a.closest('.html-preview') as HTMLElement | null);
  if (!scope) return;

  if (lower.startsWith('javascript:')) {
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }

  if (href === '' || href === '#') {
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }

  if (href.startsWith('#')) {
    ev.preventDefault();
    ev.stopPropagation();
    const fragment = href.slice(1).trim();
    if (fragment) scrollScopeToFragment(scope, fragment);
    return;
  }

  if (href.startsWith('/') && !href.startsWith('//')) {
    const hashIdx = href.indexOf('#');
    if (hashIdx >= 0) {
      const frag = href.slice(hashIdx + 1).trim();
      if (frag) {
        ev.preventDefault();
        ev.stopPropagation();
        scrollScopeToFragment(scope, decodeURIComponent(frag));
        return;
      }
    }
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }

  if (!lower.includes('://') && href.includes('#')) {
    const hashIdx = href.indexOf('#');
    const frag = href.slice(hashIdx + 1).trim();
    if (frag) {
      ev.preventDefault();
      ev.stopPropagation();
      scrollScopeToFragment(scope, decodeURIComponent(frag));
    }
    return;
  }

  try {
    const loc = (globalThis as unknown as { location?: { href: string; origin: string } }).location;
    if (!loc?.href) return;
    const u = new URL(href, loc.href);
    if (u.hash && u.hash.length > 1 && u.origin === loc.origin) {
      ev.preventDefault();
      ev.stopPropagation();
      scrollScopeToFragment(scope, decodeURIComponent(u.hash.slice(1)));
    }
  } catch {
    /* enlaces mal formados: no intervenir */
  }
}

function scrollScopeToFragment(scope: HTMLElement, fragment: string): void {
  const id = fragment.replace(/^#/, '').trim();
  if (!id) return;

  let node: Element | null = null;
  try {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      node = scope.querySelector(`#${CSS.escape(id)}`);
    }
  } catch {
    node = null;
  }

  if (!node) {
    try {
      const safe = id.replace(/"/g, '&quot;');
      node = scope.querySelector(`[name="${safe}"]`);
    } catch {
      node = null;
    }
  }

  node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
