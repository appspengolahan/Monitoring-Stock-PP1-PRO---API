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
    email: 'staffacc1bkr@gmail.com',
    nama: 'Tri Andini',
    role: 'Staff Operasional',
    password: '123',
    defaultPin: '123456',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: false,
    canAccessAI: false,
    canAccessReconciliation: true
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
  },
  {
    email: 'adintw40@gmail.com',
    nama: 'Adin Tri W',
    role: 'Admin Persediaan Cengkeh',
    password: '040401',
    defaultPin: '040401',
    isDefaultPassword: true,
    hasDevAccess: false,
    allowedKomoditas: ['Cengkeh'],
    canExportPdf: false,
    canManageUsers: false,
    canAccessAI: false,
    canAccessReconciliation: true
  }
];

let inMemoryUsers: any[] | null = null;
let inMemoryRoles: string[] | null = null;

function readUsers(): any[] {
  if (inMemoryUsers && inMemoryUsers.length > 0) {
    return inMemoryUsers;
  }
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryUsers = parsed;
        return parsed;
      }
    }
  } catch {}
  inMemoryUsers = [...DEFAULT_USERS];
  return inMemoryUsers;
}

function writeUsers(users: any[]) {
  inMemoryUsers = users;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    // Expected on read-only environments like AWS Lambda / Vercel Serverless
    console.warn('Filesystem write notice (using in-memory persistence):', e);
  }
}

function readRoles(): string[] {
  if (inMemoryRoles && inMemoryRoles.length > 0) {
    return inMemoryRoles;
  }
  try {
    if (fs.existsSync(ROLES_FILE)) {
      const raw = fs.readFileSync(ROLES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryRoles = parsed;
        return parsed;
      }
    }
  } catch {}
  inMemoryRoles = ['Admin Persediaan Cengkeh'];
  return inMemoryRoles;
}

function writeRoles(roles: string[]) {
  inMemoryRoles = roles;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Filesystem role write notice:', e);
  }
}

const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwpvTstV4SeELEB1QZgd2TR0sXIPFaJaO1owlVboHI0lnkacQPQ1_BwNrfpYMrUURVG/exec';

async function forwardToGas(payload: any) {
  try {
    fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).catch(e => console.warn('forwardToGas notice:', e));
  } catch (err) {
    console.warn('forwardToGas error:', err);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle role status update (active / inactive)
  if (req.body?.action === 'setrolestatus' || req.body?.action === 'role-status') {
    try {
      const role = String(req.body?.role || '').trim();
      const status = req.body?.status === 'inactive' ? 'inactive' : 'active';
      if (!role) {
        return res.status(400).json({ ok: false, error: 'Role is required' });
      }
      forwardToGas({ action: 'setrolestatus', role, status });
      return res.status(200).json({ ok: true, role, status });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // Handle custom role deletion
  if (req.body?.action === 'delete-role' || req.query?.action === 'delete-role' || req.body?.deleteRole) {
    try {
      const roleToDelete = String(req.body?.role || req.body?.deleteRole || req.query?.role || '').trim();
      if (!roleToDelete) {
        return res.status(400).json({ ok: false, error: 'Role is required' });
      }
      let roles = readRoles();
      roles = roles.filter(r => r.toLowerCase().trim() !== roleToDelete.toLowerCase());
      writeRoles(roles);

      // 2-Way Sync forward to Google Sheets
      forwardToGas({ action: 'deleterole', role: roleToDelete });

      return res.status(200).json({ ok: true, roles, customRoles: roles });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // Handle user deletion
  if (req.method === 'DELETE' || (req.method === 'POST' && req.body?.action === 'delete')) {
    try {
      const email = req.query?.email || req.body?.email;
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
      }
      const cleanEmail = String(email).toLowerCase().trim();
      let users = readUsers();
      users = users.filter((u: any) => u.email.toLowerCase().trim() !== cleanEmail);
      writeUsers(users);

      // 2-Way Sync forward to Google Sheets
      forwardToGas({ action: 'deleteuser', email: cleanEmail });

      return res.status(200).json({ ok: true, users, customRoles: readRoles() });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // Handle user upsert or custom role add
  if (req.method === 'POST') {
    try {
      // Role add
      if (req.body?.action === 'add-role' || (req.body?.role && !req.body?.email)) {
        const newRole = String(req.body?.role).trim();
        let roles = readRoles();
        if (newRole && !roles.includes(newRole)) {
          roles.push(newRole);
          writeRoles(roles);
        }
        return res.status(200).json({ ok: true, roles, customRoles: roles });
      }

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

      // Save role if custom
      if (config.role) {
        let roles = readRoles();
        if (!roles.includes(config.role)) {
          roles.push(config.role);
          writeRoles(roles);
        }
      }

      // 2-Way Sync forward to Google Sheets
      forwardToGas({ action: 'saveuser', user: config });

      return res.status(200).json({ ok: true, users, customRoles: readRoles() });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  const users = readUsers();
  const customRoles = readRoles();
  return res.status(200).json({ ok: true, users, customRoles });
}
