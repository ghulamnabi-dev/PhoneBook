#!/usr/bin/env node
// PhoneBook mock API — a dependency-free stand-in for the ASP.NET Core API (see ../API-CONTRACT.md).
// In-memory, resets on restart. Lets the Angular client run (and be screenshotted) without .NET or SQL Server.
//
//   node mock/server.mjs            → http://localhost:5180/api
//   PORT=5181 DELAY=0 node mock/server.mjs
//
// Sign in with demo@phonebook.local / Passw0rd! (any e-mail and password are accepted).
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 5180);
const DELAY = Number(process.env.DELAY ?? 120);
const ORIGIN = process.env.ORIGIN ?? '*';

// ---------------------------------------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------------------------------------
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();

const groups = [
  { id: 1, name: 'Family' },
  { id: 2, name: 'Friends' },
  { id: 3, name: 'Vendors' },
  { id: 4, name: 'Work' },
];
const G = { family: 1, friends: 2, vendors: 3, work: 4 };

// [first, last, company, email, [[label, number], …], groups, favourite, notes, updated ms ago]
const seed = [
  ['Ayesha', 'Khan', null, 'ayesha.khan@gmail.com', [['Mobile', '+92 300 1234567'], ['Home', '+92 42 35761234']], ['family'], true, 'Sister. Birthday 14 March.', 2 * HOUR],
  ['Bilal', 'Khan', 'Engro Corporation', 'bilal.khan@engro.com', [['Mobile', '+92 321 4455667'], ['Work', '+92 21 111 211 211']], ['family'], false, null, 3 * DAY],
  ['Zainab', 'Khan', null, null, [['Mobile', '0300-7654321']], ['family'], true, 'Ammi’s number for WhatsApp too.', 40 * DAY],
  ['Hamza', 'Akhtar', 'Systems Limited', 'hamza.akhtar@systemsltd.com', [['Work', '+92 42 111 797 836'], ['Mobile', '+92 333 5120987']], ['work'], false, 'Tech lead on the banking integration.', 5 * HOUR],
  ['Fatima', 'Malik', null, 'fatima.malik@outlook.com', [['Mobile', '+92 301 8822991']], ['friends'], true, null, 1 * DAY],
  ['Usman', 'Tariq', 'Jazz', 'usman.tariq@jazz.com.pk', [['Mobile', '+92 300 5550142'], ['Work', '+92 51 111 300 300']], ['work'], false, null, 9 * DAY],
  ['Hira', 'Siddiqui', 'Aga Khan University Hospital', 'hira.siddiqui@aku.edu', [['Mobile', '+92 345 2210876']], ['friends'], false, 'Dr. Hira — paediatrics.', 18 * DAY],
  ['Ahmed', 'Raza', 'Raza Electricians', null, [['Mobile', '0321-4567890']], ['vendors'], false, 'Did the DB board in 2025. Reasonable rates.', 70 * DAY],
  ['Sana', 'Javed', 'Careem', 'sana.javed@careem.com', [['Mobile', '+92 334 7788123']], ['work', 'friends'], true, null, 6 * HOUR],
  ['Omar', 'Farooq', 'Meezan Bank', 'omar.farooq@meezanbank.com', [['Work', '+92 21 3810 3500'], ['Mobile', '+92 302 9911223']], ['work'], false, 'Relationship manager — branch code 0102.', 25 * DAY],
  ['Maryam', 'Nawaz', null, 'maryam.n@gmail.com', [['Mobile', '+92 300 4400112']], ['friends'], false, null, 12 * DAY],
  ['Danish', 'Iqbal', 'Daraz', 'danish.iqbal@daraz.pk', [['Mobile', '+92 312 6655443']], ['work'], false, null, 33 * DAY],
  ['Rabia', 'Anwar', null, null, [['Mobile', '+92 331 2233445'], ['Home', '+92 51 2287654']], ['family'], false, 'Khala.', 90 * DAY],
  ['Kamran', 'Shah', 'Shah Plumbing Services', null, [['Mobile', '0333-1122334']], ['vendors'], false, 'Available Sundays.', 120 * DAY],
  ['Nadia', 'Hussain', 'Unilever Pakistan', 'nadia.hussain@unilever.com', [['Work', '+92 21 3568 1001']], ['work'], false, null, 4 * DAY],
  ['Faisal', 'Qureshi', null, 'faisal.qureshi@yahoo.com', [['Mobile', '+92 300 9988776']], ['friends'], false, 'University friend — LUMS ’14.', 15 * DAY],
  ['Saad', 'Mahmood', 'Arbisoft', 'saad@arbisoft.com', [['Mobile', '+92 322 4040404']], ['work'], false, null, 2 * DAY],
  ['Amna', 'Baig', null, 'amna.baig@icloud.com', [['Mobile', '+92 336 5566778']], ['friends'], true, null, 20 * HOUR],
  ['Tariq', 'Jamil', 'Jamil Auto Works', null, [['Work', '042-35881234'], ['Mobile', '+92 300 8484848']], ['vendors'], false, 'Car service. Ask for Tariq bhai.', 45 * DAY],
  ['Zara', 'Ahmed', 'Teradata', 'zara.ahmed@teradata.com', [['Mobile', '+92 333 1010101']], ['work'], false, null, 7 * DAY],
  ['Ali', 'Haider', null, 'ali.haider@gmail.com', [['Mobile', '+92 301 2345678']], ['friends'], false, 'Cricket on Saturdays.', 11 * DAY],
  ['Iqra', 'Aziz', 'Telenor Pakistan', 'iqra.aziz@telenor.com.pk', [['Work', '+92 51 111 345 100']], ['work'], false, null, 60 * DAY],
  ['Waqar', 'Younis', null, null, [['Mobile', '+92 300 1112223']], [], false, null, 200 * DAY],
  ['Mahnoor', 'Chaudhry', null, 'mahnoor.ch@gmail.com', [['Mobile', '+92 345 9090909']], ['family'], false, 'Cousin (Faisalabad).', 28 * DAY],
  ['Junaid', 'Akram', 'Packages Limited', 'junaid.akram@packages.com.pk', [['Work', '+92 42 3581 1541']], ['work'], false, null, 52 * DAY],
  ['Sadia', 'Rehman', null, null, [['Mobile', '+92 302 3344556']], ['friends'], false, null, 6 * DAY],
  ['Asad', 'Mirza', 'Mirza Caterers', 'bookings@mirzacaterers.pk', [['Work', '+92 21 3453 7788'], ['Mobile', '+92 300 2223334']], ['vendors'], false, 'Catered Bilal’s walima. Order 2 weeks ahead.', 80 * DAY],
  ['Hassan', 'Ali', 'Netsol Technologies', 'hassan.ali@netsoltech.com', [['Mobile', '+92 321 7778889']], ['work'], false, null, 13 * DAY],
  ['Noor', 'Fatima', null, null, [['Mobile', '+92 333 6677889']], ['family'], false, null, 150 * DAY],
  ['Shahid', 'Afridi', 'Afridi Movers', null, [['Mobile', '0345-1239876']], ['vendors'], false, 'Moved us to DHA in 2024.', 300 * DAY],
  ['Erum', 'Saleem', 'K-Electric', 'erum.saleem@ke.com.pk', [['Work', '+92 21 3263 7133']], [], false, null, 35 * DAY],
  ['Yasir', 'Nadeem', null, 'yasir.nadeem@protonmail.com', [['Mobile', '+92 300 6060606']], ['friends'], false, null, 17 * DAY],
  ['Rida', 'Zafar', 'Habib Bank Limited', 'rida.zafar@hbl.com', [['Mobile', '+92 334 1212121']], ['work'], false, null, 3 * HOUR],
  ['Adeel', 'Butt', 'Butt Karahi', null, [['Work', '+92 42 3630 1234']], ['vendors'], false, 'Best karahi in Lakshmi Chowk.', 100 * DAY],
  ['Sobia', 'Kazmi', null, null, [['Mobile', '+92 301 4567123']], [], false, null, 400 * DAY],
  // International
  ['Emily', 'Carter', 'Stripe', 'emily.carter@stripe.com', [['Work', '+1 415 555 0132'], ['Mobile', '+1 415 555 0177']], ['work'], false, 'Partner manager, SF office. PST.', 8 * DAY],
  ['James', 'Whitaker', 'Monzo', 'james.whitaker@monzo.com', [['Mobile', '+44 7700 900123']], ['work'], false, null, 22 * DAY],
  ['Sophie', 'Laurent', null, 'sophie.laurent@orange.fr', [['Mobile', '+33 6 12 34 56 78']], ['friends'], false, 'Met at Web Summit Lisbon.', 65 * DAY],
  ['Lukas', 'Becker', 'SAP', 'lukas.becker@sap.com', [['Work', '+49 30 901820'], ['Mobile', '+49 151 23456789']], ['work'], false, null, 27 * DAY],
  ['Priya', 'Sharma', 'Infosys', 'priya.sharma@infosys.com', [['Mobile', '+91 98765 43210']], ['work'], false, null, 14 * DAY],
  ['Omar', 'Al-Fayed', 'Emirates NBD', 'omar.alfayed@emiratesnbd.com', [['Mobile', '+971 50 123 4567']], ['work'], false, null, 5 * DAY],
  ['Mei', 'Chen', 'Shopee', 'mei.chen@shopee.sg', [['Mobile', '+65 9123 4567']], ['friends'], false, null, 95 * DAY],
  ['Carlos', 'Mendes', null, 'carlos.mendes@gmail.com', [['Mobile', '+351 912 345 678']], ['friends'], false, null, 130 * DAY],
  ['Hannah', 'Schmidt', 'Zalando', 'hannah.schmidt@zalando.de', [['Work', '+49 30 2759 46930']], [], false, null, 48 * DAY],
  ['Noah', 'Thompson', 'Atlassian', 'noah.thompson@atlassian.com', [['Mobile', '+61 412 345 678']], ['work'], false, 'Sydney — 6 hours ahead.', 19 * DAY],
  ['Aiko', 'Tanaka', null, 'aiko.tanaka@docomo.ne.jp', [['Mobile', '+81 90 1234 5678']], ['friends'], false, null, 210 * DAY],
  ['Elif', 'Yılmaz', 'Getir', 'elif.yilmaz@getir.com', [['Mobile', '+90 532 123 45 67']], ['work'], false, null, 31 * DAY],
  ['Grace', 'Okafor', 'Flutterwave', 'grace.okafor@flutterwave.com', [['Mobile', '+234 803 123 4567']], ['work'], false, null, 58 * DAY],
  ['Lars', 'Nilsson', 'Spotify', 'lars.nilsson@spotify.com', [['Mobile', '+46 70 123 45 67']], [], false, null, 160 * DAY],
  ['Isabella', 'Rossi', null, 'isabella.rossi@libero.it', [['Mobile', '+39 312 345 6789']], ['friends'], false, null, 75 * DAY],
  ['Daniel', 'Kim', 'Coupang', 'daniel.kim@coupang.com', [['Mobile', '+82 10 1234 5678']], ['work'], false, null, 240 * DAY],
  ['Olivia', 'Brown', 'Shopify', 'olivia.brown@shopify.com', [['Work', '+1 613 555 0199']], ['work'], false, null, 11 * HOUR],
  ['Ravi', 'Patel', null, 'ravi.patel@hotmail.co.uk', [['Mobile', '+44 7911 123456']], ['friends'], false, null, 85 * DAY],
  ['Mateo', 'García', 'Cabify', 'mateo.garcia@cabify.com', [['Mobile', '+34 612 34 56 78']], [], false, null, 180 * DAY],
  // No last name — the API sorts these last
  ['Ammi', null, null, null, [['Mobile', '+92 300 4000001'], ['Home', '+92 42 35710001']], ['family'], true, null, 1 * HOUR],
  ['Abbu', null, null, null, [['Mobile', '+92 300 4000002']], ['family'], true, null, 4 * DAY],
  ['Dhobi', null, 'Gulberg Laundry', null, [['Mobile', '0300-9876543']], ['vendors'], false, 'Pickup Tuesday & Friday.', 50 * DAY],
  ['Security', null, 'DHA Phase 6 gate', null, [['Work', '+92 42 3569 2000']], ['vendors'], false, null, 260 * DAY],
  ['Mali', null, null, null, [['Mobile', '0312-3456789']], ['vendors'], false, 'Gardener — Saturdays.', 110 * DAY],
  ['Rehan', null, 'Uber', null, [['Mobile', '+92 303 1239876']], [], false, null, 23 * DAY],
];

let nextContactId = 1;
let nextPhoneId = 1;
let nextGroupId = groups.length + 1;

const contacts = seed.map(([firstName, lastName, company, email, phones, gs, isFavourite, notes, ago]) => ({
  id: nextContactId++,
  firstName,
  lastName,
  company,
  email,
  notes,
  isFavourite,
  phones: phones.map(([label, number]) => ({ id: nextPhoneId++, label, number })),
  groupIds: gs.map((g) => G[g]),
  createdAt: iso(ago + 30 * DAY + (nextContactId % 7) * DAY),
  updatedAt: iso(ago),
}));

// ---------------------------------------------------------------------------------------------------------
// Helpers (mirroring the API's behaviour)
// ---------------------------------------------------------------------------------------------------------
const normalize = (n) => (n.trim().startsWith('+') ? '+' : '') + n.replace(/\D/g, '');
const displayName = (c) => (c.lastName ? `${c.firstName} ${c.lastName}` : c.firstName);
const groupRefs = (c) =>
  c.groupIds
    .map((id) => groups.find((g) => g.id === id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));

const summary = (c) => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  displayName: displayName(c),
  company: c.company,
  isFavourite: c.isFavourite,
  primaryPhone: c.phones[0]?.number ?? null,
  email: c.email,
  groups: groupRefs(c),
  updatedAt: c.updatedAt,
});
const detail = (c) => ({ ...summary(c), notes: c.notes, phones: c.phones, createdAt: c.createdAt });
const groupDto = (g) => ({ ...g, contactCount: contacts.filter((c) => c.groupIds.includes(g.id)).length });

const byName = (a, b) => {
  const al = a.lastName ? 0 : 1;
  const bl = b.lastName ? 0 : 1;
  if (al !== bl) return al - bl;
  return (
    (a.lastName ?? '').toLowerCase().localeCompare((b.lastName ?? '').toLowerCase()) ||
    a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase()) ||
    a.id - b.id
  );
};
const byRecent = (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id;

const EMAIL = /^[^@\s]+@[^@\s]+$/;
const LABELS = ['Mobile', 'Home', 'Work', 'Other'];

function validateContact(body) {
  const errors = {};
  const add = (k, m) => (errors[k] ??= []).push(m);
  const str = (v) => (typeof v === 'string' ? v : v == null ? null : String(v));
  const first = str(body.firstName)?.trim() ?? '';
  if (!first) add('FirstName', 'The FirstName field is required.');
  else if (first.length > 80) add('FirstName', 'The field FirstName must be a string with a maximum length of 80.');
  if ((str(body.lastName) ?? '').length > 80) add('LastName', 'The field LastName must be a string with a maximum length of 80.');
  if ((str(body.company) ?? '').length > 120) add('Company', 'The field Company must be a string with a maximum length of 120.');
  const email = str(body.email);
  if (email != null && (!EMAIL.test(email) || email.length > 200)) add('Email', 'The Email field is not a valid e-mail address.');
  if ((str(body.notes) ?? '').length > 2000) add('Notes', 'The field Notes must be a string with a maximum length of 2000.');
  const phones = Array.isArray(body.phones) ? body.phones : [];
  if (phones.length === 0) add('Phones', 'Add at least one phone number.');
  phones.forEach((p, i) => {
    const n = str(p?.number) ?? '';
    if (!n) add(`Phones[${i}].Number`, 'The Number field is required.');
    else if (n.length < 5 || n.length > 25) add(`Phones[${i}].Number`, 'The field Number must be a string with a minimum length of 5 and a maximum length of 25.');
    if (!LABELS.includes(p?.label)) add(`Phones[${i}].Label`, 'Label must be Mobile, Home, Work or Other.');
  });
  const normalized = phones.map((p) => normalize(str(p?.number) ?? ''));
  if (new Set(normalized).size !== normalized.length) add('Phones', 'The same number is listed more than once.');
  const ids = Array.isArray(body.groupIds) ? body.groupIds : [];
  if (ids.some((id) => !groups.some((g) => g.id === id))) add('GroupIds', 'One or more groups do not exist.');
  return Object.keys(errors).length ? errors : null;
}

function applyContact(c, body) {
  const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  c.firstName = body.firstName.trim();
  c.lastName = clean(body.lastName);
  c.company = clean(body.company);
  c.email = clean(body.email);
  c.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes : null;
  c.isFavourite = !!body.isFavourite;
  c.phones = body.phones.map((p) => ({ id: nextPhoneId++, label: p.label, number: p.number.trim() }));
  c.groupIds = [...new Set(body.groupIds ?? [])];
  c.updatedAt = new Date().toISOString();
}

// vCard ----------------------------------------------------------------------------------------------------
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const unesc = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
const telType = { Mobile: 'CELL', Home: 'HOME', Work: 'WORK', Other: 'VOICE' };

function toVCard(c) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(c.lastName ?? '')};${esc(c.firstName)};;;`, `FN:${esc(displayName(c))}`];
  if (c.company) lines.push(`ORG:${esc(c.company)}`);
  for (const p of c.phones) lines.push(`TEL;TYPE=${telType[p.label]}:${p.number}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
  if (c.notes) lines.push(`NOTE:${esc(c.notes)}`);
  lines.push(`REV:${c.updatedAt.replace(/[-:]/g, '').replace(/\.\d+/, '')}`, 'END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

function parseVCards(text) {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const cards = [];
  let card = null;
  for (const line of lines) {
    if (/^BEGIN:VCARD$/i.test(line)) card = { first: '', last: null, fn: null, org: null, email: null, note: null, phones: [] };
    else if (/^END:VCARD$/i.test(line)) {
      if (card) {
        if (!card.first && card.fn) [card.first, card.last] = [card.fn.split(' ')[0], card.fn.split(' ').slice(1).join(' ') || null];
        cards.push(card);
      }
      card = null;
    } else if (card) {
      const colon = line.indexOf(':');
      if (colon <= 0) continue;
      const [nameRaw, ...params] = line.slice(0, colon).split(';');
      const name = nameRaw.toUpperCase().replace(/^.*\./, '');
      const value = line.slice(colon + 1);
      const p = params.join(';').toUpperCase();
      if (name === 'N') {
        const [last, first] = value.split(';');
        card.last = unesc(last ?? '').trim() || null;
        card.first = unesc(first ?? '').trim();
      } else if (name === 'FN') card.fn = unesc(value).trim();
      else if (name === 'ORG') card.org = unesc(value.split(';')[0]).trim() || null;
      else if (name === 'EMAIL') card.email ??= value.trim();
      else if (name === 'NOTE') card.note = unesc(value);
      else if (name === 'TEL') {
        const label = p.includes('CELL') ? 'Mobile' : p.includes('HOME') ? 'Home' : p.includes('WORK') ? 'Work' : 'Other';
        card.phones.push({ label, number: value.trim() });
      }
    }
  }
  return cards;
}

function importCards(text) {
  const cards = parseVCards(text);
  if (cards.length === 0) return { status: 400, errors: ['The file does not contain any vCards (BEGIN:VCARD … END:VCARD).'] };
  const errors = [];
  let skipped = 0;
  const valid = [];
  cards.forEach((c, i) => {
    if (!c.first && c.phones.length === 0) return void skipped++;
    const who = c.first ? ` (${c.first.slice(0, 40)})` : '';
    const problems = [];
    if (!c.first) problems.push('a name is required.');
    if (c.email && !EMAIL.test(c.email)) problems.push(`"${c.email}" is not a valid e-mail address.`);
    for (const { number } of c.phones) {
      if (number.length < 5 || number.length > 25) problems.push(`phone number "${number}" must be 5–25 characters.`);
      else if (!/\d/.test(number)) problems.push(`phone number "${number}" contains no digits.`);
    }
    if (problems.length) errors.push(...problems.map((p) => `Card ${i + 1}${who}: ${p}`));
    else valid.push(c);
  });
  if (errors.length) return { status: 400, errors };
  const stamp = new Date().toISOString();
  for (const c of valid) {
    contacts.push({
      id: nextContactId++,
      firstName: c.first,
      lastName: c.last,
      company: c.org,
      email: c.email,
      notes: c.note,
      isFavourite: false,
      phones: c.phones.map((p) => ({ id: nextPhoneId++, ...p })),
      groupIds: [],
      createdAt: stamp,
      updatedAt: stamp,
    });
  }
  return { status: 200, body: { imported: valid.length, skipped, errors: [] } };
}

/** Pull the `file` part out of a multipart/form-data body. */
function multipartFile(buffer, contentType) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  if (!boundary) return null;
  const parts = buffer.toString('utf8').split(`--${boundary[1] ?? boundary[2]}`);
  for (const part of parts) {
    const split = part.indexOf('\r\n\r\n');
    if (split < 0) continue;
    const head = part.slice(0, split);
    if (!/name="file"/i.test(head)) continue;
    return part.slice(split + 4).replace(/\r\n$/, '');
  }
  return null;
}

// Auth -----------------------------------------------------------------------------------------------------
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function issue(name, email) {
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600;
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: '1', name, email, exp })}.mock-signature`;
  return { token, name, email, expiresAt: new Date(exp * 1000).toISOString() };
}
function userFrom(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  try {
    const payload = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString());
    return payload.exp * 1000 > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
const nameFromEmail = (email) =>
  email.split('@')[0].split(/[._-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Demo User';

// ---------------------------------------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------------------------------------
const problem = (status, title, detail) => ({ status, body: { type: `https://httpstatuses.io/${status}`, title, status, detail } });
const validation = (errors, title = 'One or more validation errors occurred.') => ({
  status: 400,
  body: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1', title, status: 400, errors },
});
const notFound = (id) => problem(404, 'Not found', `Contact ${id} was not found.`);

async function route(req, url, body) {
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method;
  const json = () => {
    try {
      return body.length ? JSON.parse(body.toString('utf8')) : {};
    } catch {
      return null;
    }
  };

  if (path === '/api/health') return { status: 200, text: 'Healthy' };

  // Auth
  if (path === '/api/auth/login' && method === 'POST') {
    const b = json() ?? {};
    if (!b.email || !b.password) return validation({ Email: ['The Email field is required.'] });
    return { status: 200, body: issue(b.email === 'demo@phonebook.local' ? 'Sara Ahmed' : nameFromEmail(b.email), b.email) };
  }
  if (path === '/api/auth/register' && method === 'POST') {
    const b = json() ?? {};
    const errors = {};
    if (!b.name?.trim()) errors.Name = ['The Name field is required.'];
    if (!EMAIL.test(b.email ?? '')) errors.Email = ['The Email field is not a valid e-mail address.'];
    if ((b.password ?? '').length < 8) errors.Password = ['Password must be at least 8 characters.'];
    if (Object.keys(errors).length) return validation(errors);
    if (b.email.toLowerCase() === 'demo@phonebook.local') return problem(409, 'Conflict', 'An account with this e-mail already exists.');
    return { status: 200, body: issue(b.name.trim(), b.email) };
  }

  const user = userFrom(req);
  if (!user) return problem(401, 'Unauthorized', 'Sign in to continue.');
  if (path === '/api/auth/me') return { status: 200, body: { id: 1, name: user.name, email: user.email } };

  // Groups
  if (path === '/api/groups' && method === 'GET') return { status: 200, body: [...groups].sort((a, b) => a.name.localeCompare(b.name)).map(groupDto) };
  if (path === '/api/groups' && method === 'POST') {
    const name = (json()?.name ?? '').trim();
    if (!name || name.length > 60) return validation({ Name: ['The field Name must be a string with a minimum length of 1 and a maximum length of 60.'] });
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) return problem(409, 'Conflict', `A group named "${name}" already exists.`);
    const g = { id: nextGroupId++, name };
    groups.push(g);
    return { status: 201, body: groupDto(g) };
  }
  let m = /^\/api\/groups\/(\d+)$/.exec(path);
  if (m) {
    const g = groups.find((x) => x.id === Number(m[1]));
    if (!g) return problem(404, 'Not found', `Group ${m[1]} was not found.`);
    if (method === 'PUT') {
      const name = (json()?.name ?? '').trim();
      if (!name || name.length > 60) return validation({ Name: ['The field Name must be a string with a minimum length of 1 and a maximum length of 60.'] });
      if (groups.some((x) => x.id !== g.id && x.name.toLowerCase() === name.toLowerCase())) return problem(409, 'Conflict', `A group named "${name}" already exists.`);
      g.name = name;
      return { status: 200, body: groupDto(g) };
    }
    if (method === 'DELETE') {
      groups.splice(groups.indexOf(g), 1);
      for (const c of contacts) c.groupIds = c.groupIds.filter((id) => id !== g.id);
      return { status: 204 };
    }
  }

  // Contacts
  if (path === '/api/contacts' && method === 'GET') {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const groupId = url.searchParams.get('groupId');
    const favourites = url.searchParams.get('favourites') === 'true';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? 50) || 50));
    const sort = url.searchParams.get('sort') === 'recent' ? byRecent : byName;
    const digits = normalize(q).replace(/^\+/, '');
    let list = contacts.filter((c) => {
      if (groupId && !c.groupIds.includes(Number(groupId))) return false;
      if (favourites && !c.isFavourite) return false;
      if (!q) return true;
      const text = [c.firstName, c.lastName, c.company, c.email].some((v) => v?.toLowerCase().includes(q));
      return text || (digits.length > 0 && c.phones.some((p) => normalize(p.number).includes(digits)));
    });
    list = list.sort(sort);
    const total = list.length;
    return {
      status: 200,
      body: { items: list.slice((page - 1) * pageSize, page * pageSize).map(summary), total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }
  if (path === '/api/contacts' && method === 'POST') {
    const b = json();
    if (!b) return validation({ $: ['The request body is not valid JSON.'] });
    const errors = validateContact(b);
    if (errors) return validation(errors);
    const stamp = new Date().toISOString();
    const c = { id: nextContactId++, createdAt: stamp };
    applyContact(c, b);
    contacts.push(c);
    return { status: 201, body: detail(c), headers: { Location: `/api/contacts/${c.id}` } };
  }
  if (path === '/api/contacts/export' && method === 'GET') {
    const groupId = Number(url.searchParams.get('groupId') ?? 0);
    const list = contacts.filter((c) => !groupId || c.groupIds.includes(groupId)).sort(byName);
    return vcard(list.map(toVCard).join(''), 'contacts.vcf');
  }
  if (path === '/api/contacts/import' && method === 'POST') {
    const text = multipartFile(body, req.headers['content-type']);
    if (!text) return validation({ File: ['Choose a .vcf file to import.'] }, 'One or more fields are invalid.');
    const result = importCards(text);
    if (result.status === 400) return validation({ File: result.errors }, 'The import was cancelled; no contacts were imported.');
    return result;
  }
  m = /^\/api\/contacts\/(\d+)(\/favourite|\/vcard)?$/.exec(path);
  if (m) {
    const c = contacts.find((x) => x.id === Number(m[1]));
    if (!c) return notFound(m[1]);
    if (m[2] === '/favourite' && method === 'PUT') {
      c.isFavourite = !!json()?.isFavourite;
      c.updatedAt = new Date().toISOString();
      return { status: 200, body: detail(c) };
    }
    if (m[2] === '/vcard' && method === 'GET') {
      const slug = displayName(c).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'contact';
      return vcard(toVCard(c), `${slug}.vcf`);
    }
    if (!m[2] && method === 'GET') return { status: 200, body: detail(c) };
    if (!m[2] && method === 'PUT') {
      const b = json();
      const errors = b ? validateContact(b) : { $: ['The request body is not valid JSON.'] };
      if (errors) return validation(errors);
      applyContact(c, b);
      return { status: 200, body: detail(c) };
    }
    if (!m[2] && method === 'DELETE') {
      contacts.splice(contacts.indexOf(c), 1);
      return { status: 204 };
    }
  }
  return problem(404, 'Not found', `No route for ${method} ${path}.`);
}

function vcard(content, filename) {
  return {
    status: 200,
    raw: content,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename=${filename}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  };
}

const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  'Access-Control-Expose-Headers': 'Content-Disposition',
  'Access-Control-Max-Age': '600',
};

const server = createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
      return;
    }
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    let out;
    try {
      out = await route(req, url, Buffer.concat(chunks));
    } catch (err) {
      console.error(err);
      out = problem(500, 'Internal Server Error', 'The mock server crashed handling this request.');
    }
    const send = () => {
      const headers = { ...cors, ...(out.headers ?? {}) };
      if (out.status === 204) res.writeHead(204, headers).end();
      else if (out.raw !== undefined) res.writeHead(out.status, headers).end(out.raw);
      else if (out.text !== undefined) res.writeHead(out.status, { ...headers, 'Content-Type': 'text/plain' }).end(out.text);
      else {
        const type = out.status >= 400 ? 'application/problem+json' : 'application/json; charset=utf-8';
        res.writeHead(out.status, { ...headers, 'Content-Type': type }).end(JSON.stringify(out.body));
      }
      console.log(`${req.method} ${url.pathname}${url.search} → ${out.status}`);
    };
    DELAY > 0 ? setTimeout(send, DELAY) : send();
  });
});

server.listen(PORT, () => console.log(`PhoneBook mock API on http://localhost:${PORT}/api (${contacts.length} contacts) — demo@phonebook.local / Passw0rd!`));
