/**
 * useKeyboardShortcuts Tests
 * 
 * Tests keyboard shortcut handling based on the actual hook implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getShortcutLabel } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const createKeyboardEvent = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    return new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    });
  };

  describe('basic shortcut handling', () => {
    it('should call observe handler when O is pressed', () => {
      const observe = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }));

      window.dispatchEvent(createKeyboardEvent('o'));

      expect(observe).toHaveBeenCalledTimes(1);
    });

    it('should call foresee handler when F is pressed', () => {
      const foresee = vi.fn();
      renderHook(() => useKeyboardShortcuts({ foresee }));

      window.dispatchEvent(createKeyboardEvent('f'));

      expect(foresee).toHaveBeenCalledTimes(1);
    });

    it('should call intuit handler when I is pressed', () => {
      const intuit = vi.fn();
      renderHook(() => useKeyboardShortcuts({ intuit }));

      window.dispatchEvent(createKeyboardEvent('i'));

      expect(intuit).toHaveBeenCalledTimes(1);
    });

    it('should call undoFate handler when U is pressed', () => {
      const undoFate = vi.fn();
      renderHook(() => useKeyboardShortcuts({ undoFate }));

      window.dispatchEvent(createKeyboardEvent('u'));

      expect(undoFate).toHaveBeenCalledTimes(1);
    });
  });

  describe('move selection shortcuts', () => {
    it('should call selectChoice1 when 1 is pressed', () => {
      const selectChoice1 = vi.fn();
      renderHook(() => useKeyboardShortcuts({ selectChoice1 }));

      window.dispatchEvent(createKeyboardEvent('1'));

      expect(selectChoice1).toHaveBeenCalledTimes(1);
    });

    it('should call selectChoice2 when 2 is pressed', () => {
      const selectChoice2 = vi.fn();
      renderHook(() => useKeyboardShortcuts({ selectChoice2 }));

      window.dispatchEvent(createKeyboardEvent('2'));

      expect(selectChoice2).toHaveBeenCalledTimes(1);
    });

    it('should call selectChoice3 when 3 is pressed', () => {
      const selectChoice3 = vi.fn();
      renderHook(() => useKeyboardShortcuts({ selectChoice3 }));

      window.dispatchEvent(createKeyboardEvent('3'));

      expect(selectChoice3).toHaveBeenCalledTimes(1);
    });

    it('should call confirmMove when Enter is pressed', () => {
      const confirmMove = vi.fn();
      renderHook(() => useKeyboardShortcuts({ confirmMove }));

      window.dispatchEvent(createKeyboardEvent('Enter'));

      expect(confirmMove).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation shortcuts', () => {
    it('should call openMap when M is pressed', () => {
      const openMap = vi.fn();
      renderHook(() => useKeyboardShortcuts({ openMap }));

      window.dispatchEvent(createKeyboardEvent('m'));

      expect(openMap).toHaveBeenCalledTimes(1);
    });

    it('should call openHero when H is pressed', () => {
      const openHero = vi.fn();
      renderHook(() => useKeyboardShortcuts({ openHero }));

      window.dispatchEvent(createKeyboardEvent('h'));

      expect(openHero).toHaveBeenCalledTimes(1);
    });

    it('should call openSettings when S is pressed', () => {
      const openSettings = vi.fn();
      renderHook(() => useKeyboardShortcuts({ openSettings }));

      window.dispatchEvent(createKeyboardEvent('s'));

      expect(openSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('general shortcuts', () => {
    it('should call dismiss when Escape is pressed', () => {
      const dismiss = vi.fn();
      renderHook(() => useKeyboardShortcuts({ dismiss }));

      window.dispatchEvent(createKeyboardEvent('Escape'));

      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it('should call newGame when N is pressed', () => {
      const newGame = vi.fn();
      renderHook(() => useKeyboardShortcuts({ newGame }));

      window.dispatchEvent(createKeyboardEvent('n'));

      expect(newGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled option', () => {
    it('should not call handlers when disabled', () => {
      const observe = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }, { disabled: true }));

      window.dispatchEvent(createKeyboardEvent('o'));

      expect(observe).not.toHaveBeenCalled();
    });
  });

  describe('modifier keys', () => {
    it('should ignore shortcuts when Ctrl is held (except Escape)', () => {
      const observe = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }));

      window.dispatchEvent(createKeyboardEvent('o', { ctrlKey: true }));

      expect(observe).not.toHaveBeenCalled();
    });

    it('should ignore shortcuts when Meta (Cmd) is held', () => {
      const observe = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }));

      window.dispatchEvent(createKeyboardEvent('o', { metaKey: true }));

      expect(observe).not.toHaveBeenCalled();
    });

    it('should ignore shortcuts when Alt is held', () => {
      const observe = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }));

      window.dispatchEvent(createKeyboardEvent('o', { altKey: true }));

      expect(observe).not.toHaveBeenCalled();
    });
  });

  describe('hint callback', () => {
    it('should call onHint on first shortcut use when showHints is true', () => {
      const observe = vi.fn();
      const onHint = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }, { showHints: true, onHint }));

      window.dispatchEvent(createKeyboardEvent('o'));

      expect(onHint).toHaveBeenCalledWith(
        expect.stringContaining('Keyboard shortcuts enabled')
      );
    });

    it('should only call onHint once', () => {
      const observe = vi.fn();
      const onHint = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }, { showHints: true, onHint }));

      window.dispatchEvent(createKeyboardEvent('o'));
      window.dispatchEvent(createKeyboardEvent('o'));
      window.dispatchEvent(createKeyboardEvent('o'));

      expect(onHint).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const observe = vi.fn();
      const { unmount } = renderHook(() => useKeyboardShortcuts({ observe }));

      unmount();

      window.dispatchEvent(createKeyboardEvent('o'));

      expect(observe).not.toHaveBeenCalled();
    });
  });

  describe('unregistered shortcuts', () => {
    it('should not call handler for unregistered keys', () => {
      const observe = vi.fn();
      renderHook(() => useKeyboardShortcuts({ observe }));

      window.dispatchEvent(createKeyboardEvent('x'));
      window.dispatchEvent(createKeyboardEvent('z'));
      window.dispatchEvent(createKeyboardEvent('q'));

      expect(observe).not.toHaveBeenCalled();
    });
  });
});

describe('getShortcutLabel', () => {
  it('should return uppercase letter for letter keys', () => {
    expect(getShortcutLabel('o')).toBe('O');
    expect(getShortcutLabel('f')).toBe('F');
    expect(getShortcutLabel('m')).toBe('M');
  });

  it('should return number for number keys', () => {
    expect(getShortcutLabel('1')).toBe('1');
    expect(getShortcutLabel('2')).toBe('2');
    expect(getShortcutLabel('3')).toBe('3');
  });

  it('should return ⏎ for enter key', () => {
    expect(getShortcutLabel('enter')).toBe('⏎');
  });

  it('should return Esc for escape key', () => {
    expect(getShortcutLabel('escape')).toBe('Esc');
  });

  it('should return uppercase for unknown keys', () => {
    expect(getShortcutLabel('x')).toBe('X');
    expect(getShortcutLabel('unknown')).toBe('UNKNOWN');
  });
});

