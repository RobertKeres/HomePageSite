import type { Request } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const PROFILE_HEADER = "x-homepage-profile";

/** Max raw profile token length (bytes-ish) to avoid abuse. */
const PROFILE_RAW_MAX = 256;

export function configFileForRequest(dataDir: string, req: Request): string {
  const rawHeader = req.headers[PROFILE_HEADER];
  const raw =
    typeof rawHeader === "string"
      ? rawHeader.trim()
      : Array.isArray(rawHeader)
        ? rawHeader[0]?.trim() ?? ""
        : "";
  if (!raw) {
    return path.join(dataDir, "config.json");
  }
  const safe = raw.slice(0, PROFILE_RAW_MAX);
  const hash = crypto.createHash("sha256").update(safe, "utf8").digest("hex");
  return path.join(dataDir, "profiles", hash, "config.json");
}

export async function ensureParentDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
