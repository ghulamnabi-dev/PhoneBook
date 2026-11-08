import { ContactDetail, ContactSummary } from '../../core/models';

let seq = 100;

/** Test builder for a list row. */
export function summary(overrides: Partial<ContactSummary> = {}): ContactSummary {
  const id = overrides.id ?? ++seq;
  const firstName = overrides.firstName ?? 'Ayesha';
  const lastName = overrides.lastName === undefined ? 'Khan' : overrides.lastName;
  return {
    id,
    firstName,
    lastName,
    displayName: lastName ? `${firstName} ${lastName}` : firstName,
    company: null,
    isFavourite: false,
    primaryPhone: '+92 300 1234567',
    email: null,
    groups: [],
    updatedAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

export function detail(overrides: Partial<ContactDetail> = {}): ContactDetail {
  return {
    ...summary(overrides),
    notes: null,
    phones: [{ id: 1, label: 'Mobile', number: '+92 300 1234567' }],
    createdAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}
