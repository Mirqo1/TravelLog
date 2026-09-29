export function swipeDirection(gesture, completed = false) {
  if (gesture.numberActiveTouches > 1 || Math.abs(gesture.dy) > 20 || Math.abs(gesture.dx) < 36 || Math.abs(gesture.dx) < Math.abs(gesture.dy) * 3) return 0;
  if (completed && Math.abs(gesture.dx) < 64 && Math.abs(gesture.vx || 0) < 0.4) return 0;
  return gesture.dx < 0 ? 1 : -1;
}
export function adjacentTab(routes, currentName, direction) {
  const index = routes.findIndex(route => route.name === currentName);
  if (index < 0 || !direction) return null;
  return routes[index + direction]?.name || null;
}
