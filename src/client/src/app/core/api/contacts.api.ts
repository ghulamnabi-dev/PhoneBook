import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactDetail, ContactInput, ContactQuery, ContactSummary, ImportResult, Paged } from '../models';

/** Thin, typed wrapper over `/api/contacts`. No state, no error handling — callers decide. */
@Injectable({ providedIn: 'root' })
export class ContactsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contacts`;

  search(query: ContactQuery = {}): Observable<Paged<ContactSummary>> {
    return this.http.get<Paged<ContactSummary>>(this.base, { params: toParams(query) });
  }

  get(id: number): Observable<ContactDetail> {
    return this.http.get<ContactDetail>(`${this.base}/${id}`);
  }

  create(input: ContactInput): Observable<ContactDetail> {
    return this.http.post<ContactDetail>(this.base, input);
  }

  update(id: number, input: ContactInput): Observable<ContactDetail> {
    return this.http.put<ContactDetail>(`${this.base}/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  setFavourite(id: number, isFavourite: boolean): Observable<ContactDetail> {
    return this.http.put<ContactDetail>(`${this.base}/${id}/favourite`, { isFavourite });
  }

  /** The whole address book (or one group) as a vCard file; the response carries Content-Disposition. */
  exportAll(groupId?: number): Observable<HttpResponse<Blob>> {
    const params = groupId ? new HttpParams().set('groupId', groupId) : undefined;
    return this.http.get(`${this.base}/export`, { params, observe: 'response', responseType: 'blob' });
  }

  exportOne(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/${id}/vcard`, { observe: 'response', responseType: 'blob' });
  }

  /** Multipart upload, field name `file`. All-or-nothing on the server. */
  import(file: File): Observable<ImportResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ImportResult>(`${this.base}/import`, body);
  }
}

/** Only send what is set, so the API defaults apply and URLs stay readable. */
function toParams(query: ContactQuery): HttpParams {
  let params = new HttpParams();
  const q = query.q?.trim();
  if (q) params = params.set('q', q);
  if (query.groupId != null) params = params.set('groupId', query.groupId);
  if (query.favourites) params = params.set('favourites', true);
  if (query.page && query.page > 1) params = params.set('page', query.page);
  if (query.pageSize) params = params.set('pageSize', query.pageSize);
  if (query.sort) params = params.set('sort', query.sort);
  return params;
}
