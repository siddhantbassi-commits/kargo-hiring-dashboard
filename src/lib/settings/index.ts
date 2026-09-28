import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type SettingKey } from "./defaults";

export async function getSetting(key: SettingKey): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return DEFAULT_SETTINGS[key];
  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? parsed : DEFAULT_SETTINGS[key];
}

export async function getAllSettings(): Promise<Record<SettingKey, number>> {
  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const values = await Promise.all(keys.map((key) => getSetting(key)));
  return Object.fromEntries(keys.map((key, i) => [key, values[i]])) as Record<SettingKey, number>;
}

export async function updateSetting(key: SettingKey, value: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export { DEFAULT_SETTINGS };
export type { SettingKey };
