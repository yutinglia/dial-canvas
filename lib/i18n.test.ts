import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getIntlLocale, setLocalePreference, t } from './i18n';

afterEach(() => {
  setLocalePreference('system');
  vi.restoreAllMocks();
  fakeBrowser.reset();
});

describe('i18n', () => {
  it('reads from the explicit locale catalog with substitutions', () => {
    setLocalePreference('en');
    expect(t('firefoxSyncLastSynced', '12:00')).toContain('12:00');
    expect(t('dialRemovedMany', '3')).toContain('3');
  });

  it('falls back to built-in English when browser i18n is empty', () => {
    setLocalePreference('system');
    vi.spyOn(browser.i18n, 'getMessage').mockReturnValue('');
    expect(t('loading')).toBe('Loading…');
    expect(t('missing.key')).toBe('missing.key');
  });

  it('uses browser.i18n when available under system preference', () => {
    setLocalePreference('system');
    vi.spyOn(browser.i18n, 'getMessage').mockReturnValue('From browser');
    expect(t('loading')).toBe('From browser');
  });

  it('maps locale preferences to Intl tags', () => {
    setLocalePreference('zh_TW');
    expect(getIntlLocale()).toBe('zh-TW');
    setLocalePreference('en');
    expect(getIntlLocale()).toBe('en');
    setLocalePreference('system');
    vi.spyOn(browser.i18n, 'getUILanguage').mockReturnValue('en_GB');
    expect(getIntlLocale()).toBe('en-GB');
  });
});
