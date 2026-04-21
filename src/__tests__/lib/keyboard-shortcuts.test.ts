/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'

describe('useKeyboardShortcuts', () => {
  it('should register shortcut and call handler on key press', () => {
    const handler = jest.fn()
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'k', handler, description: 'test' },
      ])
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle Ctrl+key combos', () => {
    const handler = jest.fn()
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'k', ctrl: true, handler, description: 'search' },
      ])
    )

    // Without ctrl - should NOT trigger
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
    expect(handler).not.toHaveBeenCalled()

    // With ctrl - should trigger
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should cleanup on unmount', () => {
    const handler = jest.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([
        { key: 'k', handler, description: 'test' },
      ])
    )

    unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle shift+key combos', () => {
    const handler = jest.fn()
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'n', shift: true, handler, description: 'new' },
      ])
    )

    // Without shift - should NOT trigger
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))
    expect(handler).not.toHaveBeenCalled()

    // With shift - should trigger
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', shiftKey: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should prevent default on matched shortcut', () => {
    const handler = jest.fn()
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'k', handler, description: 'test' },
      ])
    )

    const event = new KeyboardEvent('keydown', { key: 'k' })
    const preventSpy = jest.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)
    expect(preventSpy).toHaveBeenCalled()
  })
})
