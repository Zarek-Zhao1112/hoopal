import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { createPlatformAdapters } from './core.js';

const platform = createPlatformAdapters({
  isNative: () => Capacitor.isNativePlatform(),
  filesystem: Filesystem,
  directory: Directory,
  encoding: Encoding,
  preferences: Preferences,
  share: Share,
  app: App,
});

export const createStorageAdapter = platform.createStorageAdapter;
export const createSettingsAdapter = platform.createSettingsAdapter;
export const exportFile = platform.exportFile;
export const setupLifecycle = platform.setupLifecycle;
export const cleanupLegacyExtras = platform.cleanupLegacyExtras;
export const isNative = () => Capacitor.isNativePlatform();
export { createPlatformAdapters } from './core.js';
