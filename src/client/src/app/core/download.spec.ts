import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { filenameFromDisposition, saveResponse } from './download';

describe('filenameFromDisposition', () => {
  it('reads a bare or quoted filename', () => {
    expect(filenameFromDisposition('attachment; filename=contacts.vcf', 'x')).toBe('contacts.vcf');
    expect(filenameFromDisposition('attachment; filename="ayesha khan.vcf"', 'x')).toBe('ayesha khan.vcf');
  });

  it('prefers the RFC 5987 filename* (non-ASCII names)', () => {
    const header = `attachment; filename=elif-ylmaz.vcf; filename*=UTF-8''elif-y%C4%B1lmaz.vcf`;
    expect(filenameFromDisposition(header, 'x')).toBe('elif-yılmaz.vcf');
  });

  it('falls back when the header is missing or empty', () => {
    expect(filenameFromDisposition(null, 'contacts.vcf')).toBe('contacts.vcf');
    expect(filenameFromDisposition('attachment', 'contacts.vcf')).toBe('contacts.vcf');
  });

  it('strips path separators', () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"', 'x')).toBe('.._.._etc_passwd');
  });
});

describe('saveResponse', () => {
  it('clicks a temporary download link named after the header', () => {
    const clicked: string[] = [];
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    const res = new HttpResponse<Blob>({
      body: new Blob(['BEGIN:VCARD']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename=contacts.vcf' }),
    });
    expect(saveResponse(res, 'fallback.vcf')).toBe('contacts.vcf');
    expect(clicked).toEqual(['contacts.vcf']);
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
