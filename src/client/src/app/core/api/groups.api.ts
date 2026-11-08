import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Group } from '../models';

@Injectable({ providedIn: 'root' })
export class GroupsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/groups`;

  list(): Observable<Group[]> {
    return this.http.get<Group[]>(this.base);
  }

  create(name: string): Observable<Group> {
    return this.http.post<Group>(this.base, { name });
  }

  rename(id: number, name: string): Observable<Group> {
    return this.http.put<Group>(`${this.base}/${id}`, { name });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
