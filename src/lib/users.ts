import fs from 'fs';
import crypto from 'crypto';

const USERS_FILE = '/tmp/igs-v2-app/data/users.json';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user' | 'viewer';
  passwordHash: string;
  createdAt: string;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function getUsers(): User[] {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function findUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function verifyPassword(user: User, password: string): boolean {
  return user.passwordHash === hashPassword(password);
}

export function createUser(data: { email: string; name: string; role: string; password: string }): User {
  const users = getUsers();
  const user: User = {
    id: `user-${Date.now()}`,
    email: data.email,
    name: data.name,
    role: data.role as User['role'],
    passwordHash: hashPassword(data.password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function updateUserRole(id: string, role: string): User | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx].role = role as User['role'];
  saveUsers(users);
  return users[idx];
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  saveUsers(users);
  return true;
}
