import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PhoneBookService {
private apiUrl='https://localhost:7077/api/PhoneBook';
  constructor(private http:HttpClient) { }

  getContacts(): Observable<any> {
    return this.http.get(this.apiUrl);
    
  }
  postContact(addcontact:any){
    
    return this.http.post(this.apiUrl,addcontact);

  }
  editContact(editcontact:any):Observable<any>{
    return this.http.put(this.apiUrl,editcontact);
  }
  deleteContact(id:any): Observable<any>{
    
    return this.http.delete(this.apiUrl+"/"+id);
  }
}
