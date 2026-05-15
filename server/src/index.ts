import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appConfigSchema, defaultConfig, migrateRawConfig } from "./schema.js";
import { configFileForRequest, ensureParentDir } from "./paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "..", "data");
const CONFIG_TOKEN = process.env.CONFIG_TOKEN?.trim();
const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(__dirname, "..", "..", "frontend", "dist");

function requireAuth(req: express.Request): boolean {
  if (!CONFIG_TOKEN) return true;
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return false;
  return h.slice(7) === CONFIG_TOKEN;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readConfig(req: express.Request): Promise<{ exists: boolean; body: unknown }> {
  const configPath = configFileForRequest(DATA_DIR, req);
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return { exists: true, body: JSON.parse(raw) };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return { exists: false, body: null };
    throw e;
  }
}

async function atomicWriteJson(req: express.Request, obj: unknown) {
  const configPath = configFileForRequest(DATA_DIR, req);
  await ensureParentDir(configPath);
  const tmp = `${configPath}.${process.pid}.${Date.now()}.tmp`;
  const data = JSON.stringify(obj, null, 2);
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, configPath);
}

const app = express();
app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", async (req, res) => {
  if (CONFIG_TOKEN && !requireAuth(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { exists, body } = await readConfig(req);
    if (!exists) {
      res.status(404).json({ error: "No config yet", default: defaultConfig() });
      return;
    }
    const parsed = appConfigSchema.safeParse(migrateRawConfig(body));
    if (!parsed.success) {
      res.status(500).json({ error: "Stored config invalid", issues: parsed.error.issues });
      return;
    }
    res.json(parsed.data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to read config" });
  }
});

app.put("/api/config", async (req, res) => {
  if (!requireAuth(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = appConfigSchema.safeParse(migrateRawConfig(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid config", issues: parsed.error.issues });
    return;
  }
  try {
    await atomicWriteJson(req, parsed.data);
    res.json(parsed.data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save config" });
  }
});

app.use(express.static(STATIC_DIR, { index: false }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

await ensureDataDir();
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}, data: ${DATA_DIR}, static: ${STATIC_DIR}`);
});
