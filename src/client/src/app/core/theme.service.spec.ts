import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    root = TestBed.inject(DOCUMENT).documentElement;
    root.classList.remove('dark');
    localStorage.removeItem('phonebook.theme');
  });
  afterEach(() => {
    root.classList.remove('dark');
    localStorage.removeItem('phonebook.theme');
  });

  it('starts from the class the pre-paint script put on <html>', () => {
    root.classList.add('dark');
    expect(TestBed.inject(ThemeService).dark()).toBeTrue();
  });

  it('toggles the dark class and remembers the choice under phonebook.theme', () => {
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    expect(root.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('phonebook.theme')).toBe('dark');
    theme.toggle();
    expect(root.classList.contains('dark')).toBeFalse();
    expect(localStorage.getItem('phonebook.theme')).toBe('light');
  });
});
