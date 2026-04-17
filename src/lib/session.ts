import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export type SessionPayload = { sid: string };

export function signSession(sid: string, expiresInSeconds: number): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign({ sid }, process.env.SESSION_SECRET!, { expiresIn: expiresInSeconds }, (err, token) => {
      if (err || !token) reject(err); else resolve(token);
    });
  });
}

export function verifySession(token: string): Promise<SessionPayload | null> {
  return new Promise((resolve) => {
    jwt.verify(token, process.env.SESSION_SECRET!, (err, decoded) => {
      if (err || !decoded) return resolve(null);
      resolve(decoded as SessionPayload);
    });
  });
}

export function sessionHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
