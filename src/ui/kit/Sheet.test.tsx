// Sheet dialog tests: focus trap (FIND-UI-04), escape key, and accessibility attributes.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sheet } from './Sheet';

describe('Sheet component (FIND-UI-04)', () => {
  it('renders modal dialog with accessible attributes', () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Settings" onClose={onClose}>
        <button type="button">Action</button>
      </Sheet>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Settings');
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Info" onClose={onClose}>
        <button type="button">Inside</button>
      </Sheet>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps keyboard focus inside the sheet on Tab and Shift+Tab', () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Focus Trap" onClose={onClose}>
        <button type="button" data-testid="btn-1">First</button>
        <button type="button" data-testid="btn-2">Second</button>
      </Sheet>
    );
    const btn1 = screen.getByTestId('btn-1');
    const btn2 = screen.getByTestId('btn-2');

    // First button gets initial focus
    expect(document.activeElement).toBe(btn1);

    // Tab from last element wraps to first
    btn2.focus();
    expect(document.activeElement).toBe(btn2);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(btn1);

    // Shift+Tab from first element wraps to last
    btn1.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(btn2);
  });

  it('does not auto-focus text inputs or textareas on open to prevent mobile keyboard auto-open', () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Note" onClose={onClose}>
        <input data-testid="input-box" />
        <button type="button" data-testid="done-btn">Done</button>
      </Sheet>
    );
    const input = screen.getByTestId('input-box');
    const doneBtn = screen.getByTestId('done-btn');
    expect(document.activeElement).not.toBe(input);
    expect(document.activeElement).toBe(doneBtn);
  });

  it('keeps focus on input while typing even if parent re-renders with a new onClose reference', () => {
    let currentClose = () => {};
    const { rerender } = render(
      <Sheet title="Edit" onClose={currentClose}>
        <input data-testid="type-input" />
        <button type="button" data-testid="action-btn">Action</button>
      </Sheet>
    );
    const input = screen.getByTestId('type-input');
    input.focus();
    expect(document.activeElement).toBe(input);

    // Simulate keystroke causing parent re-render with new function reference
    currentClose = () => {};
    rerender(
      <Sheet title="Edit" onClose={currentClose}>
        <input data-testid="type-input" />
        <button type="button" data-testid="action-btn">Action</button>
      </Sheet>
    );
    expect(document.activeElement).toBe(input);
  });
});
