/**
 * Host routes backing the browser config-file editor: read and write the
 * per-user `$DSH_HOME/evolve-in-git.json` document through same-origin JSON
 * endpoints (the pattern dsh-pet's '/api/pet/*' family uses). The routes are
 * loopback-only — they write user-local data, so only the desktop may enter.
 * @module dsh-evolve-in-git/config-route
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { configFilePath } from './config.js';
import { isLoopbackRequest } from './loopback.js';
/** Browser-facing base path of the config-file API. */
export const CONFIG_FILE_ROUTE = '/api/evolve-git/config';
/** Body cap for config writes (a JSON config is small). */
const CONFIG_BODY_MAX_BYTES = 64 * 1024;
const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
};
/** Write one JSON response with the family defaults. */
function writeJson(res, status, body, headers = {}) {
    res.writeHead(status, { ...JSON_HEADERS, ...headers });
    res.end(JSON.stringify(body));
}
/** Read a request body as JSON, or null on an empty/invalid/oversized payload. */
async function readJsonBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = chunk;
        size += buffer.length;
        if (size > CONFIG_BODY_MAX_BYTES) {
            req.destroy();
            return null;
        }
        chunks.push(buffer);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (text === '')
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
    if (req.method === method)
        return true;
    writeJson(res, 405, { ok: false, error: 'method-not-allowed' });
    return false;
}
/**
 * Build the config-file routes.
 * @param onSaved - invoked after a successful write so the caller can reload
 *   its runtime config immediately (the config file is the highest-priority
 *   user layer).
 */
export function makeConfigRoutes(onSaved) {
    return [
        {
            kind: 'exact',
            path: CONFIG_FILE_ROUTE,
            handler: (req, res) => {
                void handle(req, res, onSaved);
            },
        },
    ];
}
async function handle(req, res, onSaved) {
    // The route writes user-local data; only loopback may enter.
    if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden: loopback-only' });
        return;
    }
    const path = configFilePath();
    if (req.method === 'GET') {
        const exists = existsSync(path);
        const raw = exists ? readFileSync(path, 'utf8') : '';
        writeJson(res, 200, { ok: true, path, exists, raw });
        return;
    }
    if (req.method === 'PUT') {
        if (!requireMethod(req, res, 'PUT'))
            return;
        const body = await readJsonBody(req);
        const raw = body?.raw;
        if (typeof raw !== 'string') {
            writeJson(res, 400, { ok: false, error: 'body must be { "raw": "<json text>" }' });
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            writeJson(res, 400, { ok: false, error: 'invalid-json' });
            return;
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            writeJson(res, 400, { ok: false, error: 'config must be a JSON object' });
            return;
        }
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, raw, 'utf8');
        onSaved?.();
        writeJson(res, 200, { ok: true, path, config: parsed });
        return;
    }
    writeJson(res, 405, { ok: false, error: 'method-not-allowed' });
}
