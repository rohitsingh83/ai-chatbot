let io = null;
export const setIO = (instance) => (io = instance);
export const getIO = () => io;

/** Drop every live socket of a user (their tokens were revoked). */
export function disconnectUser(userId) {
  io?.in(`user:${userId}`).disconnectSockets(true);
}
