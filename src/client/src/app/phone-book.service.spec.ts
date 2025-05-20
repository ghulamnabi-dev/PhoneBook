import { TestBed } from '@angular/core/testing';

import { PhoneBookService } from './phone-book.service';

describe('PhoneBookService', () => {
  let service: PhoneBookService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhoneBookService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
