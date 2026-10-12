import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

function authError(message, code = "UNAUTHORIZED") {
  const error = new Error(message);
  error.statusCode = 401;
  error.code = code;
  return error;
}

function issuer() {
  const region = process.env.COGNITO_REGION;
  const poolId = process.env.COGNITO_USER_POOL_ID;
  if (process.env.COGNITO_ISSUER) return process.env.COGNITO_ISSUER;
  if (!region || !poolId || poolId.includes("REPLACE_ME")) {
    const error = new Error("COGNITO_REGION and COGNITO_USER_POOL_ID are required for Cognito authentication.");
    error.statusCode = 503;
    error.code = "COGNITO_NOT_CONFIGURED";
    throw error;
  }
  return `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
}

function keys() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${issuer()}/.well-known/jwks.json`));
  return jwks;
}

export async function cognitoAuthGuard(req, _res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    if (process.env.AUTH_REQUIRED !== "true") {
      req.user = { sub: "local-development-owner", tokenUse: "development" };
      return next();
    }

    return next(authError("A Cognito bearer token is required.", "AUTH_REQUIRED"));
  }

  let configuredIssuer;
  try {
    configuredIssuer = issuer();
  } catch (error) {
    return next(error);
  }

  try {
    const token = header.slice("Bearer ".length).trim();
    const { payload } = await jwtVerify(token, keys(), {
      issuer: configuredIssuer,
      algorithms: ["RS256"]
    });
    if (payload.token_use !== "access") {
      return next(authError("A Cognito access token is required.", "INVALID_TOKEN_USE"));
    }
    if (process.env.COGNITO_APP_CLIENT_ID && payload.client_id !== process.env.COGNITO_APP_CLIENT_ID) {
      return next(authError("The token was issued for a different app client.", "INVALID_CLIENT"));
    }
    if (!payload.sub) return next(authError("The Cognito token has no subject.", "INVALID_SUBJECT"));
    req.user = { sub: payload.sub, username: payload.username || null, tokenUse: payload.token_use };
    return next();
  } catch {
    return next(authError("The Cognito access token is invalid or expired.", "INVALID_TOKEN"));
  }
}

export async function requireCognitoAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next(authError("A Cognito bearer token is required.", "AUTH_REQUIRED"));
  return cognitoAuthGuard(req, _res, next);
}

export function developmentAuthGuard(req, res, next) {
  return cognitoAuthGuard(req, res, next);
}
