/** Clamp a context-menu top-left so the menu stays inside the viewport. */
export function clampMenuPosition(
  clientX: number,
  clientY: number,
  menuW: number,
  menuH: number,
  pad = 8,
): { x: number; y: number } {
  const x = Math.min(clientX, window.innerWidth - menuW - pad);
  const y = Math.min(clientY, window.innerHeight - menuH - pad);
  return {
    x: Math.max(pad, x),
    y: Math.max(pad, y),
  };
}
