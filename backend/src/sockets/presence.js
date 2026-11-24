const online = new Map(); // userId -> number of open sockets

export function join(userId) {
  online.set(userId, (online.get(userId) || 0) + 1);
}
export function leave(userId) {
  const n = (online.get(userId) || 1) - 1;
  if (n <= 0) online.delete(userId);
  else online.set(userId, n);
}
export const onlineCount = () => online.size;
