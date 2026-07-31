/**
 * Close an open context-menu backdrop and re-fire contextmenu on the element
 * underneath so a second right-click opens the appropriate custom menu instead
 * of the browser native menu.
 */
export function closeAndRetargetContextMenu(
  event: MouseEvent,
  backdrop: HTMLElement,
  onClose: () => void,
): void {
  event.preventDefault();
  event.stopPropagation();
  backdrop.style.pointerEvents = 'none';
  const under = document.elementFromPoint(event.clientX, event.clientY);
  backdrop.style.pointerEvents = '';
  onClose();
  if (under) {
    under.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: 2,
        buttons: 2,
      }),
    );
  }
}
