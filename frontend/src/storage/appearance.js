export const APPEARANCE_KEY = 'hoopal-appearance-v1';
export const GLASS_APPEARANCE = 'glass';
export const REALISTIC_APPEARANCE = 'realistic';

export function createAppearanceStore(adapter) {
  return {
    async read() {
      const value = await adapter.getItem(APPEARANCE_KEY);
      return value === REALISTIC_APPEARANCE ? REALISTIC_APPEARANCE : GLASS_APPEARANCE;
    },
    async write(appearance) {
      if (appearance !== GLASS_APPEARANCE && appearance !== REALISTIC_APPEARANCE) {
        throw new TypeError('外观设置无效');
      }
      await adapter.setItem(APPEARANCE_KEY, appearance);
    },
  };
}
