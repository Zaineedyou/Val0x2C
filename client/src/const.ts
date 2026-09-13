export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the Google OAuth login.
export const startLogin = () => {
  window.location.assign("/api/auth/google");
};
