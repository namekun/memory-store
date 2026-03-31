import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Database } from "bun:sqlite";
import { homedir } from "os";
import { join } from "path";

const DB_PATH = process.env.MEMORY_STORE_DB_PATH
  || join(homedir(), ".claude", "mcp-servers", "memory-store", "data", "memory.db");

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA foreign_keys=ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    tags TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)
`);

const server = new McpServer({
  name: "memory-store",
  version: "1.0.0",
});

// ── save ──
server.tool(
  "memory_save",
  "Save a key-value pair with optional category and tags. Updates if key exists.",
  {
    key: z.string().describe("Unique key for this memory"),
    value: z.string().describe("Content to store"),
    category: z.string().default("general").describe("Category (e.g. decision, debug, architecture, todo)"),
    tags: z.string().default("").describe("Comma-separated tags for search"),
  },
  async ({ key, value, category, tags }) => {
    const stmt = db.prepare(`
      INSERT INTO memories (key, value, category, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        tags = excluded.tags,
        updated_at = datetime('now', 'localtime')
    `);
    stmt.run(key, value, category, tags);
    return { content: [{ type: "text", text: `Saved: ${key} [${category}]` }] };
  }
);

// ── get ──
server.tool(
  "memory_get",
  "Retrieve a memory by exact key.",
  {
    key: z.string().describe("Key to retrieve"),
  },
  async ({ key }) => {
    const row = db.prepare("SELECT * FROM memories WHERE key = ?").get(key) as any;
    if (!row) {
      return { content: [{ type: "text", text: `Not found: ${key}` }] };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify(row, null, 2),
      }],
    };
  }
);

// ── search ──
server.tool(
  "memory_search",
  "Search memories by keyword across key, value, and tags.",
  {
    query: z.string().describe("Search keyword"),
    category: z.string().optional().describe("Filter by category"),
    limit: z.number().default(20).describe("Max results"),
  },
  async ({ query, category, limit }) => {
    const pattern = `%${query}%`;
    let sql = `
      SELECT * FROM memories
      WHERE (key LIKE ? OR value LIKE ? OR tags LIKE ?)
    `;
    const params: any[] = [pattern, pattern, pattern];

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    sql += " ORDER BY updated_at DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as any[];

    if (rows.length === 0) {
      return { content: [{ type: "text", text: `No results for: ${query}` }] };
    }

    const result = rows.map((r) => ({
      key: r.key,
      category: r.category,
      tags: r.tags,
      updated_at: r.updated_at,
      value: r.value.length > 200 ? r.value.slice(0, 200) + "..." : r.value,
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── list ──
server.tool(
  "memory_list",
  "List memories by category, or list all categories with counts.",
  {
    category: z.string().optional().describe("Category to list. Omit to see all categories."),
    limit: z.number().default(50).describe("Max results"),
  },
  async ({ category, limit }) => {
    if (!category) {
      const rows = db.prepare(`
        SELECT category, COUNT(*) as count, MAX(updated_at) as last_updated
        FROM memories GROUP BY category ORDER BY last_updated DESC
      `).all() as any[];

      const total = db.prepare("SELECT COUNT(*) as count FROM memories").get() as any;
      return {
        content: [{
          type: "text",
          text: `Total: ${total.count} memories\n\n` +
            JSON.stringify(rows, null, 2),
        }],
      };
    }

    const rows = db.prepare(`
      SELECT key, tags, updated_at, substr(value, 1, 100) as preview
      FROM memories WHERE category = ?
      ORDER BY updated_at DESC LIMIT ?
    `).all(category, limit) as any[];

    return {
      content: [{
        type: "text",
        text: JSON.stringify(rows, null, 2),
      }],
    };
  }
);

// ── delete ──
server.tool(
  "memory_delete",
  "Delete a memory by key.",
  {
    key: z.string().describe("Key to delete"),
  },
  async ({ key }) => {
    const result = db.prepare("DELETE FROM memories WHERE key = ?").run(key);
    return {
      content: [{
        type: "text",
        text: result.changes > 0 ? `Deleted: ${key}` : `Not found: ${key}`,
      }],
    };
  }
);

// ── stats ──
server.tool(
  "memory_stats",
  "Show database statistics.",
  {},
  async () => {
    const total = db.prepare("SELECT COUNT(*) as count FROM memories").get() as any;
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count FROM memories GROUP BY category
    `).all() as any[];
    const recent = db.prepare(`
      SELECT key, category, updated_at FROM memories ORDER BY updated_at DESC LIMIT 5
    `).all() as any[];
    const oldest = db.prepare(`
      SELECT key, category, created_at FROM memories ORDER BY created_at ASC LIMIT 3
    `).all() as any[];

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ total: total.count, categories, recent, oldest }, null, 2),
      }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
