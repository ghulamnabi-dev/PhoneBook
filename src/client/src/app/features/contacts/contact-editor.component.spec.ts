import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/notification.service';
import { GroupsStore } from '../groups/groups.store';
import { ContactEditorComponent, ContactEditorData } from './contact-editor.component';
import { detail } from './testing';

describe('ContactEditorComponent', () => {
  let fixture: ComponentFixture<ContactEditorComponent>;
  let editor: ContactEditorComponent;
  let http: HttpTestingController;
  let ref: jasmine.SpyObj<MatDialogRef<ContactEditorComponent>>;
  let notify: jasmine.SpyObj<NotificationService>;

  function setup(data: ContactEditorData): void {
    ref = jasmine.createSpyObj('MatDialogRef', ['close']);
    notify = jasmine.createSpyObj('NotificationService', ['error', 'success']);
    TestBed.configureTestingModule({
      imports: [ContactEditorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
        { provide: NotificationService, useValue: notify },
        { provide: GroupsStore, useValue: { groups: signal([{ id: 1, name: 'Family', contactCount: 1 }]) } },
      ],
    });
    fixture = TestBed.createComponent(ContactEditorComponent);
    editor = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('starts a new contact with one empty Mobile row and the defaults', () => {
    setup({ contact: null, defaults: { groupIds: [1], isFavourite: true } });
    expect(editor.phones.length).toBe(1);
    expect(editor.phones.at(0).value).toEqual({ label: 'Mobile', number: '' });
    expect(editor.form.controls.groupIds.value).toEqual([1]);
    expect(editor.form.controls.isFavourite.value).toBeTrue();
  });

  it('never removes the last phone row and picks an unused label for new rows', () => {
    setup({ contact: null });
    editor.removePhone(0);
    expect(editor.phones.length).toBe(1);
    editor.addPhone();
    expect(editor.phones.at(1).controls.label.value).toBe('Home');
  });

  it('does not submit an invalid form', () => {
    setup({ contact: null });
    editor.save();
    http.expectNone(`${environment.apiUrl}/contacts`);
    expect(editor.form.controls.firstName.touched).toBeTrue();
  });

  it('sends empty optional fields as null and closes with the saved contact', () => {
    setup({ contact: null });
    editor.form.patchValue({ firstName: ' Ali ' });
    editor.phones.at(0).patchValue({ number: ' +92 300 1234567 ' });
    editor.save();
    const req = http.expectOne(`${environment.apiUrl}/contacts`);
    expect(req.request.body).toEqual({
      firstName: 'Ali', lastName: null, company: null, email: null, notes: null, isFavourite: false,
      phones: [{ label: 'Mobile', number: '+92 300 1234567' }], groupIds: [],
    });
    const saved = detail({ id: 9, firstName: 'Ali' });
    req.flush(saved, { status: 201, statusText: 'Created' });
    expect(ref.close).toHaveBeenCalledWith(saved);
  });

  it('maps "Phones[1].Number" and "Phones" from a 400 onto the phone rows', () => {
    const contact = detail({
      id: 4,
      phones: [
        { id: 1, label: 'Mobile', number: '+92 300 1234567' },
        { id: 2, label: 'Work', number: '+92 21 111 222 333' },
      ],
    });
    setup({ contact });
    editor.save();
    http.expectOne(`${environment.apiUrl}/contacts/4`).flush(
      { title: 'One or more validation errors occurred.', errors: { 'Phones[1].Number': ['Too short.'], Phones: ['The same number is listed more than once.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(editor.phones.at(1).controls.number.getError('server')).toBe('Too short.');
    expect(editor.phones.at(0).controls.number.hasError('server')).toBeFalse();
    expect(editor.phones.getError('server')).toBe('The same number is listed more than once.');
    expect(ref.close).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Too short.');
  });
});
