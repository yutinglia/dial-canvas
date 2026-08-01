import { describe, expect, it, vi } from 'vitest';
import {
  createDialFromEditor,
  mergeDialFromEditor,
  parseDialEditorValues,
  type DialEditorValues,
} from './fromEditor';
import type { Dial } from '../schemas/dial';

const baseDial: Dial = {
  id: 'd1',
  title: 'Old',
  url: 'https://old.example/',
  faviconUrl: 'https://old.example/icon.png',
  iconSize: 32,
  fontSize: 14,
  backgroundColor: '#112233',
  backgroundOpacity: 0.5,
  showWhenNarrow: true,
  narrowOrder: 2,
  x: 10,
  y: 20,
  width: 64,
  height: 64,
};

const validValues: DialEditorValues = {
  title: 'New',
  url: 'https://example.com/path',
  faviconUrl: 'https://cdn.example/f.ico',
  iconSize: 40,
  fontSize: 16,
  backgroundColor: '#abcdef',
  backgroundOpacity: 0.8,
  showWhenNarrow: true,
  narrowOrder: 1,
};

describe('parseDialEditorValues', () => {
  it('normalizes allowed urls and favicons', () => {
    expect(parseDialEditorValues(validValues)).toEqual({
      ok: true,
      url: 'https://example.com/path',
      faviconUrl: 'https://cdn.example/f.ico',
    });
  });

  it('rejects disallowed or empty urls', () => {
    expect(
      parseDialEditorValues({ ...validValues, url: 'javascript:alert(1)' }),
    ).toEqual({ ok: false });
    expect(parseDialEditorValues({ ...validValues, url: '   ' })).toEqual({
      ok: false,
    });
  });
});

describe('mergeDialFromEditor', () => {
  it('updates fields and clears omitted optionals', () => {
    const merged = mergeDialFromEditor(
      baseDial,
      {
        title: 'Merged',
        url: 'https://example.com/',
        showWhenNarrow: false,
      },
      'https://example.com/',
      undefined,
    );
    expect(merged).toMatchObject({
      id: 'd1',
      title: 'Merged',
      url: 'https://example.com/',
      faviconUrl: undefined,
      showWhenNarrow: false,
      x: 10,
      y: 20,
    });
    expect(merged).not.toHaveProperty('iconSize');
    expect(merged).not.toHaveProperty('fontSize');
    expect(merged).not.toHaveProperty('backgroundColor');
    expect(merged).not.toHaveProperty('backgroundOpacity');
    expect(merged).not.toHaveProperty('narrowOrder');
  });

  it('keeps explicit optional styling when provided', () => {
    const merged = mergeDialFromEditor(
      baseDial,
      validValues,
      'https://example.com/path',
      'https://cdn.example/f.ico',
    );
    expect(merged.iconSize).toBe(40);
    expect(merged.fontSize).toBe(16);
    expect(merged.backgroundColor).toBe('#abcdef');
    expect(merged.backgroundOpacity).toBe(0.8);
    expect(merged.narrowOrder).toBe(1);
  });
});

describe('createDialFromEditor', () => {
  it('builds a dial with a new id and slot', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
    const dial = createDialFromEditor(
      validValues,
      'https://example.com/path',
      'https://cdn.example/f.ico',
      { x: 40, y: 60, width: 80, height: 80 },
    );
    expect(dial).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'New',
      url: 'https://example.com/path',
      faviconUrl: 'https://cdn.example/f.ico',
      showWhenNarrow: true,
      iconSize: 40,
      fontSize: 16,
      backgroundColor: '#abcdef',
      backgroundOpacity: 0.8,
      narrowOrder: 1,
      x: 40,
      y: 60,
      width: 80,
      height: 80,
    });
  });

  it('omits optional fields when not provided', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000002',
    );
    const dial = createDialFromEditor(
      { title: 'Bare', url: 'https://example.com/' },
      'https://example.com/',
      undefined,
      { x: 0, y: 0, width: 64, height: 64 },
    );
    expect(dial).toEqual({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Bare',
      url: 'https://example.com/',
      faviconUrl: undefined,
      showWhenNarrow: false,
      x: 0,
      y: 0,
      width: 64,
      height: 64,
    });
  });
});
