// Shapes of the PhoneBook API (see API-CONTRACT.md). JSON is camelCase.

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserAccount {
  id: number;
  name: string;
  email: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const PHONE_LABELS = ['Mobile', 'Home', 'Work', 'Other'] as const;
export type PhoneLabel = (typeof PHONE_LABELS)[number];

export interface GroupRef {
  id: number;
  name: string;
}

export interface Group extends GroupRef {
  contactCount: number;
}

export interface GroupInput {
  name: string;
}

export interface Phone {
  id: number;
  label: PhoneLabel;
  number: string;
}

export interface ContactSummary {
  id: number;
  firstName: string;
  lastName: string | null;
  displayName: string;
  company: string | null;
  isFavourite: boolean;
  primaryPhone: string | null;
  email: string | null;
  groups: GroupRef[];
  updatedAt: string;
}

export interface ContactDetail extends ContactSummary {
  notes: string | null;
  phones: Phone[];
  createdAt: string;
}

export interface PhoneInput {
  label: PhoneLabel;
  number: string;
}

/** Optional text fields are sent as null when empty ([EmailAddress] rejects ""). */
export interface ContactInput {
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  notes: string | null;
  isFavourite: boolean;
  phones: PhoneInput[];
  groupIds: number[];
}

export type ContactSort = 'name' | 'recent';

export interface ContactQuery {
  q?: string;
  groupId?: number;
  favourites?: boolean;
  page?: number;
  pageSize?: number;
  sort?: ContactSort;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/** Which slice of the address book a list column shows. */
export type ContactScope = 'all' | 'favourites' | 'group';
