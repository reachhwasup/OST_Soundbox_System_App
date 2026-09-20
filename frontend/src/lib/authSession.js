export function readSession(storage) {
  const token = storage.getItem('token');
  try {
    const user = JSON.parse(storage.getItem('user') || 'null');
    if (token && user && typeof user === 'object' && !Array.isArray(user) && user.id != null) {
      return { token, user };
    }
  } catch {
    // Invalid cached JSON must not prevent the login page from opening.
  }
  storage.removeItem('token');
  storage.removeItem('user');
  return { token: null, user: null };
}

export function clearSession(storage) {
  storage.removeItem('token');
  storage.removeItem('user');
}
