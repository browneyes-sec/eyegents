import chokidar from "chokidar";
import { indexer } from "./indexer.js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../..");

export function startWatcher(): void {
  const watcher = chokidar.watch(["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py", "**/*.go", "**/*.rs"], {
    cwd: ROOT,
    ignored: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**", "**/*.test.ts", "**/*.spec.ts"],
    ignoreInitial: true,
    persistent: true
  });

  let debounceTimer: NodeJS.Timeout | null = null;
  const pendingFiles = new Set<string>();

  watcher.on("all", (event, filePath) => {
    if (event === "add" || event === "change") {
      pendingFiles.add(filePath);
    } else if (event === "unlink") {
      pendingFiles.delete(filePath);
      handleDelete(filePath);
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processPending();
    }, 1000);
  });

  async function processPending() {
    for (const file of pendingFiles) {
      try {
        await indexer.reindexFile(file);
        console.log(`🔄 Reindexed: ${file}`);
      } catch (e) {
        console.error(`❌ Watch reindex failed for ${file}:`, e);
      }
    }
    pendingFiles.clear();
  }

  async function handleDelete(filePath: string) {
    const relativePath = filePath.replace(ROOT + "/", "");
    try {
      await import("@eyegents/qdrant-client").then(m => m.qdrantClient.delete("code_chunks", [relativePath]));
      console.log(`🗑️  Removed from index: ${relativePath}`);
    } catch (e) {
      console.error(`❌ Failed to remove ${relativePath}:`, e);
    }
  }

  console.log("👀 File watcher started");
}

startWatcher();