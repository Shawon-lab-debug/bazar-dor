import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.BETTER_AUTH_SECRET;
const authUrl = process.env.BETTER_AUTH_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from environment variables.");
}

if (!authSecret || authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
}

if (!authUrl) {
  throw new Error("BETTER_AUTH_URL is missing from environment variables.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
});

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
};

export const auth = betterAuth({
  appName: "Bazar Dor",
  baseURL: authUrl,
  secret: authSecret,
  trustedOrigins: [authUrl],
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
      allowDifferentEmails: false,
      requireLocalEmailVerified: false,
    },
  },
  socialProviders,
});