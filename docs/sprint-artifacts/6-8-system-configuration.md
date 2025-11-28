# Story 6.8: System Configuration

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 6.8 |
| **Epic** | Epic 6: Admin Dashboard |
| **Title** | System Configuration |
| **Priority** | P2 - Medium |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As an** admin
**I want** to configure platform settings
**So that** I can adjust system behavior

## Context

Some platform behaviors should be configurable without code changes. This includes defaults for signatures, email settings, and potentially a maintenance mode for updates.

**Dependencies:**
- Story 6.1 (Admin Layout)

## Acceptance Criteria

- [ ] **AC-1:** Platform name/branding settings
- [ ] **AC-2:** Default signature request expiry days
- [ ] **AC-3:** Email notification toggles
- [ ] **AC-4:** Maintenance mode toggle
- [ ] **AC-5:** Settings persisted to database
- [ ] **AC-6:** Settings loaded on app startup
- [ ] **AC-7:** Changes logged to activity log
- [ ] **AC-8:** Settings validation

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/db/schema/admin.ts` | Add system_settings table |
| `server/routes/admin/settings.ts` | New: Settings API |
| `server/services/settings.ts` | New: Settings service |
| `client/src/pages/admin/SystemSettings.tsx` | New: Settings page |
| `server/middleware/maintenance.ts` | New: Maintenance mode check |

### Implementation

#### Database Schema

```typescript
// server/db/schema/admin.ts - Already defined in tech spec
export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: varchar('updated_by', { length: 36 }).references(() => users.id),
});
```

#### Settings Service

```typescript
// server/services/settings.ts
import { db } from '../db';
import { systemSettings } from '../db/schema/admin';
import { eq } from 'drizzle-orm';

// Default settings
const DEFAULT_SETTINGS: Record<string, { value: any; description: string }> = {
  'platform.name': {
    value: 'Aermuse',
    description: 'Platform display name',
  },
  'platform.maintenance_mode': {
    value: false,
    description: 'Enable maintenance mode (blocks non-admin access)',
  },
  'signature.default_expiry_days': {
    value: 30,
    description: 'Default days until signature request expires',
  },
  'email.notifications_enabled': {
    value: true,
    description: 'Enable email notifications',
  },
  'email.marketing_enabled': {
    value: false,
    description: 'Enable marketing emails',
  },
};

// Cache for settings
let settingsCache: Map<string, any> | null = null;

/**
 * Initialize settings with defaults
 */
export async function initializeSettings() {
  for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });

    if (!existing) {
      await db.insert(systemSettings).values({
        key,
        value: config.value,
        description: config.description,
      });
    }
  }

  // Populate cache
  await refreshSettingsCache();
}

/**
 * Refresh the settings cache
 */
export async function refreshSettingsCache() {
  const allSettings = await db.query.systemSettings.findMany();
  settingsCache = new Map(allSettings.map((s) => [s.key, s.value]));
}

/**
 * Get a setting value
 */
export async function getSetting<T = any>(key: string): Promise<T | null> {
  // Try cache first
  if (settingsCache?.has(key)) {
    return settingsCache.get(key) as T;
  }

  // Fetch from database
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, key),
  });

  if (setting) {
    // Update cache
    settingsCache?.set(key, setting.value);
    return setting.value as T;
  }

  // Return default if exists
  return DEFAULT_SETTINGS[key]?.value ?? null;
}

/**
 * Get all settings
 */
export async function getAllSettings() {
  const settings = await db.query.systemSettings.findMany();

  // Merge with defaults for any missing
  const result: Record<string, any> = {};

  for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
    const dbSetting = settings.find((s) => s.key === key);
    result[key] = {
      value: dbSetting?.value ?? config.value,
      description: config.description,
      updatedAt: dbSetting?.updatedAt,
    };
  }

  return result;
}

/**
 * Update a setting
 */
export async function updateSetting(
  key: string,
  value: any,
  updatedBy: string
) {
  // Validate key exists
  if (!DEFAULT_SETTINGS[key]) {
    throw new Error(`Unknown setting key: ${key}`);
  }

  await db
    .update(systemSettings)
    .set({
      value,
      updatedAt: new Date(),
      updatedBy,
    })
    .where(eq(systemSettings.key, key));

  // Update cache
  settingsCache?.set(key, value);

  return { key, value };
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return (await getSetting<boolean>('platform.maintenance_mode')) ?? false;
}
```

#### Settings API

```typescript
// server/routes/admin/settings.ts
import { Router } from 'express';
import {
  getAllSettings,
  updateSetting,
  getSetting,
} from '../../services/settings';
import { logAdminActivity } from '../../services/adminActivity';

const router = Router();

// GET /api/admin/settings
router.get('/', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json({ settings });
  } catch (error) {
    console.error('[ADMIN] Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// GET /api/admin/settings/:key
router.get('/:key', async (req, res) => {
  try {
    const value = await getSetting(req.params.key);

    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('[ADMIN] Get setting error:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// PUT /api/admin/settings/:key
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // Validate value
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Type validation based on setting
    const validations: Record<string, (v: any) => boolean> = {
      'platform.name': (v) => typeof v === 'string' && v.length > 0,
      'platform.maintenance_mode': (v) => typeof v === 'boolean',
      'signature.default_expiry_days': (v) =>
        typeof v === 'number' && v >= 1 && v <= 365,
      'email.notifications_enabled': (v) => typeof v === 'boolean',
      'email.marketing_enabled': (v) => typeof v === 'boolean',
    };

    if (validations[key] && !validations[key](value)) {
      return res.status(400).json({ error: 'Invalid value for this setting' });
    }

    const result = await updateSetting(key, value, req.session.userId!);

    // Log activity
    await logAdminActivity({
      req,
      action: 'settings.update',
      entityType: 'setting',
      entityId: key,
      details: { key, value },
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ADMIN] Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
```

#### Maintenance Mode Middleware

```typescript
// server/middleware/maintenance.ts
import { Request, Response, NextFunction } from 'express';
import { isMaintenanceMode } from '../services/settings';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export async function checkMaintenanceMode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip for admin routes and webhooks
  if (
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/webhooks')
  ) {
    return next();
  }

  const maintenanceEnabled = await isMaintenanceMode();

  if (!maintenanceEnabled) {
    return next();
  }

  // Check if user is admin
  const userId = req.session?.userId;
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { isAdmin: true },
    });

    if (user?.isAdmin) {
      return next();
    }
  }

  res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'We are currently performing maintenance. Please try again later.',
    maintenanceMode: true,
  });
}
```

#### System Settings Page

```tsx
// client/src/pages/admin/SystemSettings.tsx
import { useState, useEffect } from 'react';
import { Save, Loader2, AlertTriangle } from 'lucide-react';

interface Setting {
  value: any;
  description: string;
  updatedAt?: string;
}

interface Settings {
  [key: string]: Setting;
}

export function SystemSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    const value = pendingChanges[key] ?? settings[key]?.value;

    try {
      setIsSaving(key);
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        setSettings((prev) => ({
          ...prev,
          [key]: { ...prev[key], value, updatedAt: new Date().toISOString() },
        }));
        setPendingChanges((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
      }
    } finally {
      setIsSaving(null);
    }
  };

  const getValue = (key: string) => {
    return pendingChanges[key] ?? settings[key]?.value;
  };

  const hasChange = (key: string) => {
    return pendingChanges[key] !== undefined;
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl">
      {/* Maintenance Mode Warning */}
      {settings['platform.maintenance_mode']?.value && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Maintenance Mode Active</p>
            <p className="text-yellow-700 text-sm">
              Non-admin users cannot access the platform while maintenance mode is enabled.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Platform Settings */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Platform</h2>

          <div className="space-y-4">
            <SettingRow
              label="Platform Name"
              description={settings['platform.name']?.description}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getValue('platform.name') || ''}
                  onChange={(e) => handleChange('platform.name', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                {hasChange('platform.name') && (
                  <SaveButton
                    onClick={() => handleSave('platform.name')}
                    isLoading={isSaving === 'platform.name'}
                  />
                )}
              </div>
            </SettingRow>

            <SettingRow
              label="Maintenance Mode"
              description={settings['platform.maintenance_mode']?.description}
            >
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getValue('platform.maintenance_mode') || false}
                    onChange={(e) =>
                      handleChange('platform.maintenance_mode', e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-burgundy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burgundy" />
                </label>
                {hasChange('platform.maintenance_mode') && (
                  <SaveButton
                    onClick={() => handleSave('platform.maintenance_mode')}
                    isLoading={isSaving === 'platform.maintenance_mode'}
                  />
                )}
              </div>
            </SettingRow>
          </div>
        </section>

        {/* Signature Settings */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Signatures</h2>

          <SettingRow
            label="Default Expiry (Days)"
            description={settings['signature.default_expiry_days']?.description}
          >
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={getValue('signature.default_expiry_days') || 30}
                onChange={(e) =>
                  handleChange('signature.default_expiry_days', parseInt(e.target.value))
                }
                className="w-24 px-3 py-2 border rounded-lg"
              />
              {hasChange('signature.default_expiry_days') && (
                <SaveButton
                  onClick={() => handleSave('signature.default_expiry_days')}
                  isLoading={isSaving === 'signature.default_expiry_days'}
                />
              )}
            </div>
          </SettingRow>
        </section>

        {/* Email Settings */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Email</h2>

          <div className="space-y-4">
            <SettingRow
              label="Notifications Enabled"
              description={settings['email.notifications_enabled']?.description}
            >
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getValue('email.notifications_enabled') ?? true}
                    onChange={(e) =>
                      handleChange('email.notifications_enabled', e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-burgundy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burgundy" />
                </label>
                {hasChange('email.notifications_enabled') && (
                  <SaveButton
                    onClick={() => handleSave('email.notifications_enabled')}
                    isLoading={isSaving === 'email.notifications_enabled'}
                  />
                )}
              </div>
            </SettingRow>

            <SettingRow
              label="Marketing Emails"
              description={settings['email.marketing_enabled']?.description}
            >
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getValue('email.marketing_enabled') || false}
                    onChange={(e) =>
                      handleChange('email.marketing_enabled', e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-burgundy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burgundy" />
                </label>
                {hasChange('email.marketing_enabled') && (
                  <SaveButton
                    onClick={() => handleSave('email.marketing_enabled')}
                    isLoading={isSaving === 'email.marketing_enabled'}
                  />
                )}
              </div>
            </SettingRow>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-0">
      <div className="mr-4">
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SaveButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="p-2 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
    </button>
  );
}
```

## Definition of Done

- [ ] Settings table created
- [ ] Default settings initialized
- [ ] Settings API working
- [ ] Settings page renders all options
- [ ] Changes persist to database
- [ ] Settings cached for performance
- [ ] Maintenance mode blocks non-admins
- [ ] Changes logged to activity

## Testing Checklist

### Unit Tests

- [ ] Setting validation
- [ ] Cache refresh

### Integration Tests

- [ ] Get/update settings API
- [ ] Maintenance mode middleware

### E2E Tests

- [ ] Change setting and verify persistence
- [ ] Enable/disable maintenance mode

## Related Documents

- [Epic 6 Tech Spec](./tech-spec-epic-6.md)
- [Story 6.9: Admin Activity Log](./6-9-admin-activity-log.md)
