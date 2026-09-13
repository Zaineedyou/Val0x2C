// Keep the app's locally signed session separate from the platform runtime's
// `app_session_id` cookie. The runtime cookie is not signed with this app's
// JWT_SECRET and must never be passed to the local JWT verifier.
export const COOKIE_NAME = "val0x2c_session";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
