// api/user-configs.ts (Vercel Serverless Function & Cloud Run API)
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'user_configs.json');
const ROLES_FILE = path.join(DATA_DIR, 'custom_roles.json');

const DEFAULT_USERS = [
  {
    email: 'obeetools@gmail.com',
    nama: 'Web Developer (ObeeTools)',
    role: 'Web Developer',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: false,
    hasDevAccess: true,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true,
    canAccessAI: true,
    canAccessReconciliation: true
  },
  {
    email: 'loehendra@gmail.com',
    nama: 'Lalu Mahendra (Site Enginer/PM)',
    role: 'Site Engineer / PM',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: false,
    hasDevAccess: true,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true,
    canAccessAI: true,
    canAccessReconciliation: true
  },
  {
    email: 'pengolahan.pp1@gmail.com',
    nama: 'Admin Pengolahan PP1',
    role: 'Admin Produksi',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true,
    canAccessAI: true,
    canAccessReconciliation: true
  },
  {
    email: 'appspengolahan@gmail.com',
    nama: 'Admin Pengolahan PP1 (Alt)',
    role: 'Admin Produksi',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true,
    canAccessAI: true,
    canAccessReconciliation: true
  },
  {
    email: 'divisi1.bkr@gmail.com',
    nama: 'Admin Divisi I (BKR)',
    role: 'Admin Produksi',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true,
    canAccessAI: true,
    canAccessReconciliation: true
  },
  {
    email: 'feedkreatif@gmail.com',
    nama: 'Staff Accounting',
    role: 'Accounting',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: false,
    canAccessAI: false,
    canAccessReconciliation: false
  },
  {
    email: 'mandor.cengkeh@batukarang.com',
    nama: 'Mandor Gudang Cengkeh',
    role: 'Staff Operasional',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['Cengkeh'],
    canExportPdf: false,
    canManageUsers: false,
    canAccessAI: false,
    canAccessReconciliation: true
  },
  {
    email: 'mandor.blend@batukarang.com',
    nama: 'Mandor Tembakau Blend',
    role: 'Staff Operasional',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['Tembakau Blend'],
    canExportPdf: false,
    canManageUsers: false,
    canAccessAI: false,
    canAccessReconciliation: true
  },
  {
    email: 'assmanajer.pp1@gmail.com',
    nama: 'Asisten Developer',
    role: 'Staff Operasional',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['Tembakau Blend'],
    canExportPdf: false,
    canManageUsers: false,
    canAccessAI: false,
    canAccessReconciliation: true
  }
];

function readUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_USERS;
}

function writeUsers(users: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write user configs:', e);
  }
}

function readRoles(): string[] {
  try {
    if (fs.existsSync(ROLES_FILE)) {
      const raw = fs.readFileSync(ROLES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return ['Accounting'];
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const config = req.body || {};
      if (!config.email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
      }

      const cleanEmail = String(config.email).toLowerCase().trim();
      let users = readUsers();
      const idx = users.findIndex((u: any) => u.email.toLowerCase().trim() === cleanEmail);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...config, email: cleanEmail };
      } else {
        users.push({ ...config, email: cleanEmail });
      }
      writeUsers(users);
      return res.status(200).json({ ok: true, users });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  const users = readUsers();
  const customRoles = readRoles();
  return res.status(200).json({ ok: true, users, customRoles });
}
