import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeAndRetargetContextMenu } from './retargetContextMenu';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('closeAndRetargetContextMenu', () => {
  it('closes the backdrop and re-fires contextmenu on the element below', () => {
    const under = {
      dispatchEvent: vi.fn(),
    };
    const backdrop = { style: { pointerEvents: '' } } as HTMLElement;
    const onClose = vi.fn();
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 42,
      clientY: 84,
      screenX: 142,
      screenY: 184,
    } as unknown as MouseEvent;

    class FakeMouseEvent {
      type: string;
      bubbles: boolean;
      cancelable: boolean;
      clientX: number;
      clientY: number;
      screenX: number;
      screenY: number;
      button: number;
      buttons: number;
      constructor(
        type: string,
        init: {
          bubbles?: boolean;
          cancelable?: boolean;
          clientX?: number;
          clientY?: number;
          screenX?: number;
          screenY?: number;
          button?: number;
          buttons?: number;
        } = {},
      ) {
        this.type = type;
        this.bubbles = init.bubbles ?? false;
        this.cancelable = init.cancelable ?? false;
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
        this.screenX = init.screenX ?? 0;
        this.screenY = init.screenY ?? 0;
        this.button = init.button ?? 0;
        this.buttons = init.buttons ?? 0;
      }
    }

    vi.stubGlobal('MouseEvent', FakeMouseEvent);
    vi.stubGlobal('document', {
      elementFromPoint: vi.fn(() => under),
    });

    closeAndRetargetContextMenu(event, backdrop, onClose);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(under.dispatchEvent).toHaveBeenCalledOnce();
    const dispatched = under.dispatchEvent.mock.calls[0]?.[0] as FakeMouseEvent;
    expect(dispatched.type).toBe('contextmenu');
    expect(dispatched.clientX).toBe(42);
    expect(dispatched.clientY).toBe(84);
    expect(dispatched.button).toBe(2);
    expect(backdrop.style.pointerEvents).toBe('');
  });

  it('still closes when nothing is under the pointer', () => {
    const backdrop = { style: { pointerEvents: '' } } as HTMLElement;
    const onClose = vi.fn();
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 1,
      clientY: 1,
      screenX: 1,
      screenY: 1,
    } as unknown as MouseEvent;

    vi.stubGlobal('document', {
      elementFromPoint: vi.fn(() => null),
    });

    closeAndRetargetContextMenu(event, backdrop, onClose);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
