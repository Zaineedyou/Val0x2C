import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import axios from "axios";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { upsertUser, getUserByOpenId } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { logger } from "./logger";

const STATE_COOKIE = "val0x2c_google_state";
const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

function redirectUri(req: Request) {
  return ENV.googleRedirectUri || `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
}

function configured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!configured()) {
      logger.error("auth.google.config_missing", "Google OAuth credentials are not configured");
      res.status(503).send("Google OAuth belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET.");
      return;
    }
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/",
    });
    const url = new URL(GOOGLE_AUTHORIZE);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "online");
    res.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query;
    const cookies = req.headers.cookie ?? "";
    const expected = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1);
    res.clearCookie(STATE_COOKIE, { path: "/" });
    if (error) {
      res.redirect(`/?auth_error=${encodeURIComponent(String(error))}`);
      return;
    }
    const stateMatches = typeof state === "string" && Boolean(expected)
      && state.length === expected!.length
      && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected!));
    if (typeof code !== "string" || !stateMatches) {
      logger.warn("auth.google.callback.rejected", { reason: "invalid_state_or_code" });
      res.status(400).send("OAuth state tidak valid atau sudah kedaluwarsa.");
      return;
    }
    try {
      const token = await axios.post(GOOGLE_TOKEN, new URLSearchParams({
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: redirectUri(req),
        grant_type: "authorization_code",
      }).toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      const profile = await axios.get(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${token.data.access_token}` } });
      const googleId = String(profile.data.sub);
      await upsertUser({
        openId: `google_${googleId}`,
        name: profile.data.name || profile.data.email || "Google user",
        email: profile.data.email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });
      const user = await getUserByOpenId(`google_${googleId}`);
      if (!user) throw new Error("User creation failed");
      const session = await sdk.createSessionToken(user.openId, { name: user.name || "Google user", expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, session, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      logger.info("auth.google.callback.completed", { userId: user.id });
      res.redirect("/");
    } catch (authError) {
      logger.error("auth.google.callback.failed", authError);
      res.redirect("/?auth_error=google_callback_failed");
    }
  });
}
