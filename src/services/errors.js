export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** Plain-language messages: what happened, what it means, what to do. */
export const ERROR_COPY = {
  invalid_email: 'That address does not look right. Check it for typing mistakes and try again.',
  delivery_failed:
    'We could not send a code to that address. Check the address, then try again in a few minutes.',
  incorrect_code: 'That code is not correct. Check the latest email and enter all six digits.',
  expired_code: 'That code has expired. Send a new code and use the newest email.',
  rate_limited: 'Too many attempts. Wait a few minutes before trying again.',
  not_found: 'We could not find this check. It may have expired. Start a new check to continue.',
  network: 'We could not reach Sentinel. Check your connection and try again.',
  unknown: 'Something went wrong on our side. Try again, or start a new check.',
}

export const messageFor = (err) => ERROR_COPY[err?.code] || ERROR_COPY.unknown
