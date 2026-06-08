const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

// Varsayılan yapı
const DEFAULT = {
  userRoles: {},   // { [userKey]: { role, updatedAt } }
  userNotes: {},   // { [userKey]: [{ id, text, createdAt }] }
  skills: [],      // [{ id, name, category, description, color, createdAt }]
  holidays: [],    // [{ id, date (YYYY-MM-DD), name, type: 'resmi'|'sirket'|'izin'|'yari', isHalfDay }]
};

// Dosyayı oku (yoksa oluştur)
const read = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(DEFAULT));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT));
  }
};

// Dosyaya yaz
const write = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
};

// ── User Roles ────────────────────────────────────────────────────────────────
const getRole = (userKey) => {
  const db = read();
  return db.userRoles[userKey] || null;
};

const setRole = (userKey, role) => {
  const db = read();
  db.userRoles[userKey] = { role, updatedAt: new Date().toISOString() };
  write(db);
  return db.userRoles[userKey];
};

const getAllRoles = () => read().userRoles;

// ── User Notes ────────────────────────────────────────────────────────────────
const getNotes = (userKey) => {
  const db = read();
  return db.userNotes[userKey] || [];
};

const addNote = (userKey, text) => {
  const db = read();
  if (!db.userNotes[userKey]) db.userNotes[userKey] = [];
  const note = { id: Date.now().toString(), text, createdAt: new Date().toISOString() };
  db.userNotes[userKey].unshift(note);
  write(db);
  return note;
};

const deleteNote = (userKey, noteId) => {
  const db = read();
  db.userNotes[userKey] = (db.userNotes[userKey] || []).filter((n) => n.id !== noteId);
  write(db);
};

// ── Skills ───────────────────────────────────────────────────────────────────
const getSkills = () => {
  const db = read();
  return db.skills || [];
};

const addSkill = ({ name, category, description, color }) => {
  const db = read();
  if (!db.skills) db.skills = [];
  const skill = {
    id: Date.now().toString(),
    name,
    category: category || 'Genel',
    description: description || '',
    color: color || 'blue',
    createdAt: new Date().toISOString(),
  };
  db.skills.push(skill);
  write(db);
  return skill;
};

const updateSkill = (id, updates) => {
  const db = read();
  const idx = (db.skills || []).findIndex((s) => s.id === id);
  if (idx === -1) return null;
  db.skills[idx] = { ...db.skills[idx], ...updates, updatedAt: new Date().toISOString() };
  write(db);
  return db.skills[idx];
};

const deleteSkill = (id) => {
  const db = read();
  db.skills = (db.skills || []).filter((s) => s.id !== id);
  write(db);
};

// ── Holidays ──────────────────────────────────────────────────────────────────
const getHolidays = (year) => {
  const db = read();
  const all = db.holidays || [];
  if (!year) return all;
  return all.filter((h) => h.date && h.date.startsWith(String(year)));
};

const upsertHoliday = ({ date, name, type, isHalfDay }) => {
  const db = read();
  if (!db.holidays) db.holidays = [];
  // Aynı tarih varsa güncelle
  const idx = db.holidays.findIndex((h) => h.date === date);
  if (idx !== -1) {
    db.holidays[idx] = { ...db.holidays[idx], name, type, isHalfDay: !!isHalfDay, updatedAt: new Date().toISOString() };
    write(db);
    return db.holidays[idx];
  }
  const holiday = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    date,
    name: name || '',
    type: type || 'resmi',
    isHalfDay: !!isHalfDay,
    createdAt: new Date().toISOString(),
  };
  db.holidays.push(holiday);
  db.holidays.sort((a, b) => a.date.localeCompare(b.date));
  write(db);
  return holiday;
};

const deleteHoliday = (date) => {
  const db = read();
  db.holidays = (db.holidays || []).filter((h) => h.date !== date);
  write(db);
};

const bulkUpsertHolidays = (list) => {
  // list: [{ date, name, type, isHalfDay }]
  const db = read();
  if (!db.holidays) db.holidays = [];
  for (const item of list) {
    const idx = db.holidays.findIndex((h) => h.date === item.date);
    const entry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      ...item,
      isHalfDay: !!item.isHalfDay,
      createdAt: new Date().toISOString(),
    };
    if (idx !== -1) db.holidays[idx] = { ...db.holidays[idx], ...item, updatedAt: new Date().toISOString() };
    else db.holidays.push(entry);
  }
  db.holidays.sort((a, b) => a.date.localeCompare(b.date));
  write(db);
  return db.holidays;
};

module.exports = {
  getRole, setRole, getAllRoles,
  getNotes, addNote, deleteNote,
  getSkills, addSkill, updateSkill, deleteSkill,
  getHolidays, upsertHoliday, deleteHoliday, bulkUpsertHolidays,
};
