import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { ContactScope } from './core/models';

const page = () => import('./features/contacts/contacts-page.component').then((m) => m.ContactsPageComponent);
const detail = () => import('./features/contacts/contact-detail.component').then((m) => m.ContactDetailComponent);
const nothing = () => import('./features/contacts/no-selection.component').then((m) => m.NoSelectionComponent);

/** Every list scope has the same two children: an empty detail pane and one contact. */
const detailChildren: Routes = [
  { path: '', loadComponent: nothing },
  { path: ':id', loadComponent: detail },
];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Sign in · PhoneBook',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
    title: 'Create account · PhoneBook',
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'contacts' },
      { path: 'contacts', title: 'Contacts · PhoneBook', data: { scope: 'all' satisfies ContactScope }, loadComponent: page, children: detailChildren },
      { path: 'favourites', title: 'Favourites · PhoneBook', data: { scope: 'favourites' satisfies ContactScope }, loadComponent: page, children: detailChildren },
      { path: 'groups/:groupId', title: 'Group · PhoneBook', data: { scope: 'group' satisfies ContactScope }, loadComponent: page, children: detailChildren },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
