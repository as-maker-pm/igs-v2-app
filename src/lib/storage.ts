import { readFile, writeFile, mkdir, unlink, access } from 'fs/promises';
import path from 'path';
import {
  ClientConfig,
  ClientRegistry,
  ClientRegistryEntry,
  createDefaultClientConfig,
} from '@/types/client';
import { ZipDataMap } from '@/types/data';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CLIENTS_DIR = path.join(DATA_DIR, 'clients');
const SHARED_DIR = path.join(DATA_DIR, 'shared');

// Helper to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Client Registry Operations
export async function getClientRegistry(): Promise<ClientRegistry> {
  const indexPath = path.join(CLIENTS_DIR, '_index.json');
  try {
    const data = await readFile(indexPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return empty registry if file doesn't exist
    return { clients: [], lastUpdated: new Date().toISOString() };
  }
}

export async function saveClientRegistry(registry: ClientRegistry): Promise<void> {
  const indexPath = path.join(CLIENTS_DIR, '_index.json');
  registry.lastUpdated = new Date().toISOString();
  await writeFile(indexPath, JSON.stringify(registry, null, 2));
}

// Client Config Operations
export async function getClientConfig(slug: string): Promise<ClientConfig | null> {
  const configPath = path.join(CLIENTS_DIR, slug, 'config.json');
  try {
    const data = await readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveClientConfig(slug: string, config: ClientConfig): Promise<void> {
  const clientDir = path.join(CLIENTS_DIR, slug);
  await mkdir(clientDir, { recursive: true });

  config.updatedAt = new Date().toISOString();
  const configPath = path.join(clientDir, 'config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function createClient(
  slug: string,
  name: string,
  password: string
): Promise<ClientConfig> {
  // Generate unique ID
  const id = crypto.randomUUID();

  // Create client config
  const config = createDefaultClientConfig(id, slug, name);
  config.password = password;

  // Save config
  await saveClientConfig(slug, config);

  // Update registry
  const registry = await getClientRegistry();
  const entry: ClientRegistryEntry = {
    id,
    slug,
    name,
    createdAt: config.createdAt,
    isActive: true,
  };
  registry.clients.push(entry);
  await saveClientRegistry(registry);

  return config;
}

export async function updateClient(
  slug: string,
  updates: Partial<ClientConfig>
): Promise<ClientConfig | null> {
  const config = await getClientConfig(slug);
  if (!config) return null;

  // Merge updates
  const updatedConfig: ClientConfig = {
    ...config,
    ...updates,
    // Preserve nested objects properly
    branding: updates.branding ? { ...config.branding, ...updates.branding } : config.branding,
    dataConfig: updates.dataConfig
      ? { ...config.dataConfig, ...updates.dataConfig }
      : config.dataConfig,
    dashboardSettings: updates.dashboardSettings
      ? { ...config.dashboardSettings, ...updates.dashboardSettings }
      : config.dashboardSettings,
    mapSettings: updates.mapSettings
      ? { ...config.mapSettings, ...updates.mapSettings }
      : config.mapSettings,
  };

  await saveClientConfig(slug, updatedConfig);

  // Update registry if name changed
  if (updates.name) {
    const registry = await getClientRegistry();
    const entryIndex = registry.clients.findIndex((c) => c.slug === slug);
    if (entryIndex >= 0) {
      registry.clients[entryIndex].name = updates.name;
      await saveClientRegistry(registry);
    }
  }

  return updatedConfig;
}

export async function deleteClient(slug: string): Promise<boolean> {
  const clientDir = path.join(CLIENTS_DIR, slug);

  // Check if client exists
  if (!(await fileExists(path.join(clientDir, 'config.json')))) {
    return false;
  }

  // Remove from registry
  const registry = await getClientRegistry();
  registry.clients = registry.clients.filter((c) => c.slug !== slug);
  await saveClientRegistry(registry);

  // Delete client directory (recursively)
  const { rm } = await import('fs/promises');
  await rm(clientDir, { recursive: true, force: true });

  return true;
}

// Client Data Operations
export async function getClientZipData(slug: string): Promise<ZipDataMap | null> {
  const dataPath = path.join(CLIENTS_DIR, slug, 'zip_data.json');
  try {
    const data = await readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveClientZipData(slug: string, data: ZipDataMap): Promise<void> {
  const clientDir = path.join(CLIENTS_DIR, slug);
  await mkdir(clientDir, { recursive: true });

  const dataPath = path.join(clientDir, 'zip_data.json');
  await writeFile(dataPath, JSON.stringify(data));
}

export async function getClientProviders(slug: string): Promise<unknown | null> {
  const providersPath = path.join(CLIENTS_DIR, slug, 'providers.geojson');
  try {
    const data = await readFile(providersPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveClientProviders(slug: string, geojson: unknown): Promise<void> {
  const clientDir = path.join(CLIENTS_DIR, slug);
  await mkdir(clientDir, { recursive: true });

  const providersPath = path.join(clientDir, 'providers.geojson');
  await writeFile(providersPath, JSON.stringify(geojson));
}

// Logo Operations
export async function saveClientLogo(
  slug: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const clientDir = path.join(CLIENTS_DIR, slug);
  await mkdir(clientDir, { recursive: true });

  // Get file extension
  const ext = path.extname(filename).toLowerCase();
  const logoFilename = `logo${ext}`;
  const logoPath = path.join(clientDir, logoFilename);

  await writeFile(logoPath, buffer);

  return logoFilename;
}

export async function getClientLogoPath(slug: string): Promise<string | null> {
  const clientDir = path.join(CLIENTS_DIR, slug);
  const extensions = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

  for (const ext of extensions) {
    const logoPath = path.join(clientDir, `logo${ext}`);
    if (await fileExists(logoPath)) {
      return `logo${ext}`;
    }
  }

  return null;
}

export async function deleteClientLogo(slug: string): Promise<boolean> {
  const logoPath = await getClientLogoPath(slug);
  if (!logoPath) return false;

  const fullPath = path.join(CLIENTS_DIR, slug, logoPath);
  await unlink(fullPath);
  return true;
}

// Shared Data Operations
export async function getSharedDataPath(filename: string): Promise<string> {
  return path.join(SHARED_DIR, filename);
}

// Slug Validation
export function isValidSlug(slug: string): boolean {
  // Alphanumeric, hyphens, underscores, 3-50 chars
  return /^[a-z0-9][a-z0-9_-]{2,49}$/.test(slug);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Check if slug is available
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const registry = await getClientRegistry();
  return !registry.clients.some((c) => c.slug === slug);
}
