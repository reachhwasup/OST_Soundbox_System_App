// The API answers in English. These are the replies a signed-out person can hit, so they get
// translated for display; anything unknown is shown as the API sent it.
const SERVER_MESSAGES = {
  'This phone number is already registered. Please log in instead.': 'phoneAlreadyRegistered',
  'Incorrect phone number or password.': 'wrongCredentials',
  'Your account has been deactivated or suspended. Please contact administrator.': 'accountSuspended',
  'Current password is incorrect.': 'currentPasswordWrong',
  'Phone number cannot be changed as it is used as your unique login identity.': 'phoneCannotChange',
};

/** Translates a known API message, falling back to the message itself. */
export function translateServerMessage(detail, t) {
  if (!detail) return '';
  const text = String(detail).trim();
  const key = SERVER_MESSAGES[text];
  return key ? t(key, text) : text;
}
