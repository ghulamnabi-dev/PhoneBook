import { HttpResponse } from '@angular/common/http';

/**
 * File name from a Content-Disposition header. Prefers RFC 5987 `filename*=UTF-8''…` (non-ASCII names),
 * then a quoted or bare `filename=`. Returns `fallback` when the header is missing or unreadable.
 */
export function filenameFromDisposition(header: string | null | undefined, fallback: string): string {
  if (!header) return fallback;
  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)?''([^;]+)/i.exec(header);
  if (extended) {
    try {
      return sanitize(decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ''))) || fallback;
    } catch {
      /* malformed escape — fall through to the plain parameter */
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  const name = plain ? (plain[2] ?? plain[1]).trim() : '';
  return sanitize(name) || fallback;
}

/** No path separators or control characters in a downloaded file name. */
function sanitize(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\\/\u0000-\u001f]/g, '_').trim();
}

/** Save a blob response as a file, using the server-supplied name. */
export function saveResponse(res: HttpResponse<Blob>, fallback: string, doc: Document = document): string {
  const name = filenameFromDisposition(res.headers.get('Content-Disposition'), fallback);
  if (!res.body) return name;
  const url = URL.createObjectURL(res.body);
  const a = doc.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return name;
}
