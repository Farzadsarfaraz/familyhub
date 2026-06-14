import { AxiosError } from 'axios';

const NETWORK_MESSAGES: Record<string, string> = {
  ECONNABORTED:   'Request timed out. Please try again.',
  ERR_NETWORK:    'Cannot reach the server. Check your internet connection.',
  ERR_CANCELED:   'Request was cancelled.',
};

export function parseApiError(err: unknown): string {
  const axiosErr = err as AxiosError<{ message?: string | string[]; error?: string }>;

  // No response = network / timeout error
  if (!axiosErr.response) {
    const code = axiosErr.code ?? '';
    return NETWORK_MESSAGES[code] ?? 'Cannot reach the server. Check your connection.';
  }

  const message = axiosErr.response.data?.message;

  // class-validator returns an array — take the first one
  if (Array.isArray(message)) return humanize(message[0]);

  if (typeof message === 'string' && message.length > 0) return humanize(message);

  // Fall back to HTTP status description
  const status = axiosErr.response.status;
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'This already exists. Please try a different value.';
  if (status === 422) return 'Invalid data submitted. Please check your input.';
  if (status >= 500)  return 'Server error. Please try again in a moment.';

  return 'Something went wrong. Please try again.';
}

// Capitalise first letter and ensure sentence ends with a period
function humanize(msg: string): string {
  if (!msg) return 'Something went wrong.';
  const s = msg.charAt(0).toUpperCase() + msg.slice(1);
  return s.endsWith('.') ? s : s + '.';
}
