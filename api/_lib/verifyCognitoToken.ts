import { createRemoteJWKSet, jwtVerify } from "jose";

const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

if (!region || !userPoolId || !clientId) {
  throw new Error("Missing COGNITO_REGION / COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID env vars");
}

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

/**
 * Verifies a Cognito ID token's signature and standard claims (issuer, audience,
 * expiry) against this app's user pool. Throws on any verification failure — callers
 * must treat a thrown error as "not authenticated" (401), not retry or fall back.
 */
export const verifyCognitoIdToken = async (idToken: string) => {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: clientId,
  });
  return payload;
};
