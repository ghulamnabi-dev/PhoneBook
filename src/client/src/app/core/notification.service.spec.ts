import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snack }] });
    service = TestBed.inject(NotificationService);
  });

  const shown = () => snack.open.calls.mostRecent().args[0];

  it('shows a success message without an action', () => {
    service.success('Saved');
    expect(snack.open).toHaveBeenCalledWith('Saved', undefined, jasmine.objectContaining({ panelClass: 'snack-success' }));
  });

  it('shows a plain string error as given', () => {
    service.error('Boom');
    expect(shown()).toBe('Boom');
    expect(snack.open.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-error' }));
  });

  it('explains that the API is unreachable for status 0', () => {
    service.error(new HttpErrorResponse({ status: 0 }));
    expect(shown()).toBe('Cannot reach the API. Is the server running?');
  });

  it('tells the user their session expired for a 401', () => {
    service.error(new HttpErrorResponse({ status: 401 }));
    expect(shown()).toBe('Your session has expired. Please sign in again.');
  });

  it('shows a string error body verbatim', () => {
    service.error(new HttpErrorResponse({ status: 400, error: 'Contact already exists' }));
    expect(shown()).toBe('Contact already exists');
  });

  it('uses the title of a problem-details body', () => {
    service.error(new HttpErrorResponse({ status: 400, error: { title: 'Validation failed' } }));
    expect(shown()).toBe('Validation failed');
  });

  it('says "Not found." for a 404 with no body', () => {
    service.error(new HttpErrorResponse({ status: 404 }));
    expect(shown()).toBe('Not found.');
  });

  it('falls back to a generic message including the status', () => {
    service.error(new HttpErrorResponse({ status: 500 }));
    expect(shown()).toBe('Request failed (500).');
  });
});
