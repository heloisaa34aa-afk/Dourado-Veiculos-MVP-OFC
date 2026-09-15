import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260914_fix_admin_users_permissions.sql'),
  'utf8',
);
const edgeFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/admin-users/index.ts'),
  'utf8',
);

describe('admin user creation contract', () => {
  it('grants only the admin table operations used by the Edge Function', () => {
    expect(migration).toMatch(/GRANT SELECT, INSERT, DELETE ON TABLE public\.admins TO service_role/);
  });

  it('persists the required email column with the administrator role', () => {
    expect(edgeFunction).toMatch(/admin\.from\('admins'\)\.insert\(\{[\s\S]*?email,[\s\S]*?role: 'admin'/);
  });
});
