import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const KEY = 'phonebook.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  readonly dark = signal(this.doc.documentElement.classList.contains('dark'));

  toggle(): void {
    const next = !this.dark();
    this.dark.set(next);
    this.doc.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }
}
