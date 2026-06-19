# Upstream catch-up plan — `albertcwong/tableau-mcp` ← `tableau/tableau-mcp`

Generated 2026-06-19.

## OUTCOME (executed on branch `merge/upstream-v2.15`)

Merged `upstream/main` (v2.15.1) into the fork. All 29 conflicts resolved and all 12 unique
fork tools ported to the new framework; base is green: **tsc 0, eslint clean, build OK,
1781 tests pass**.

- **Bucket A** (take-upstream): done — grafted JWT scopes, 50mb body limit, and process
  exception handlers onto upstream's restructured files; dropped my MCP-Apps-only deps
  (`adm-zip` was dead, `chart.js`/`vite` belonged to the dropped apps).
- **Bucket B** (merge-both): done — kept publish/download/updateDatasourceData/Hyper SDK
  methods; took upstream's rewritten `restApi.ts` and re-grafted my Flows/Sites/FileUploads
  getters + the 4th `_fileUploads` constructor arg; standardized on `RestApiCredentials`.
- **Bucket C** (add/add): done — took upstream's projects/users/tasks API+methods; grafted
  my `runExtractRefresh` endpoint+method onto upstream's tasks layer.
- **Bucket D** (re-home): done — dropped my old-location tools (upstream moved them to
  `web/`); my `getSuccessResult`/`structuredContent` shapes were dropped with F1 (they fed
  the dropped apps); took upstream's split `server.web/desktop.test.ts`.
- **Bucket E** (unique tools): **done — all 12 ported.** Upstream rewrote the tool framework
  (`Tool`→`WebTool`, `extra`-based contract, central scope registry). Rewrote all 12 unique
  tools against `WebTool` and registered them in `web/toolName.ts` (names + groups
  `flow`/`site`/`file`), `web/tools.ts` (factories), and `server/oauth/scopes.ts` (new MCP
  scopes `datasource:write`/`workbook:write`/`flow:read`/`flow:write`/`tasks:run`/`site:read`
  + API scopes incl. `sites:read`). Tools: download-{datasource,workbook,flow},
  get-downloaded-file, publish-{datasource,workbook,flow}, update-datasource-data, list-flows,
  run-flow, run-extract-refresh, list-sites. `get-downloaded-file` got a Passthrough-auth guard
  (no API scopes). Duplicate tools (listProjects/listUsers/listExtractRefreshTasks) were dropped
  in favor of upstream's. `.port-pending/` removed.
- **Bucket F** (MCP Apps): **F1 chosen** — adopted upstream's `src/web/apps` model; dropped
  `mcp-app/`, `src/mcpApps.ts`, and the mcp-apps doc.

All work complete. Final state: tsc 0, eslint clean, build OK, **1781 tests pass**.
46 web tools registered (34 upstream + 12 ported).

---

## Original analysis (pre-merge)

## Situation

- Local `main`: **10 ahead, 99 behind** `upstream/main`.
- Version: yours `1.15.1` → upstream `2.15.1` (major jump; upstream changed 561 files, +49k/−9.7k).
- Trial merge (`git merge-tree`): **29 conflicting files** — 19 content, 6 add/add, 4 modify/delete.

## Two findings that shape everything

1. **Upstream reorganized tools into `src/tools/web/` and `src/tools/desktop/`.** Your tools live in the old flat `src/tools/*`. Your work must be **re-homed**, not line-merged.
2. **Upstream built its own MCP Apps** (`src/web/apps/` — `embedTableauViz`, `mcp-app.html`) and its tool wrapper already exposes the `getSuccessResult` hook. So your MCP Apps work (`mcp-app/`, `src/mcpApps.ts`) and your `structuredContent` edits are now a **head-to-head overlap**, not a clean addition. Decide per-tool whether your `getSuccessResult` (structuredContent shape) is still wanted on top of upstream's app model.

## Recommended mechanics

- Branch off first: `git checkout -b merge/upstream-v2.15`.
- **Merge, not rebase** (rebasing 10 commits replays each conflict 10×).
- Order: (1) take-upstream files, (2) re-home modify/delete, (3) merge-both data-layer files, (4) port the 11 unique tool dirs into `web/`, (5) decide MCP Apps, (6) regen lockfile, (7) `npm run build` + `vitest`.

---

## A. Take upstream wholesale (your delta is small/superseded) — 8 files

| File | Why | Action |
|------|-----|--------|
| `package-lock.json` | derived artifact | **Regenerate** — delete conflict, `npm install` after `package.json` resolved |
| `src/overridableConfig.test.ts` | upstream +794 vs your +14 | take upstream; re-add your 2-3 assertions only if still relevant |
| `src/server/middleware.ts` | upstream deleted 30 lines; your change is 1 line | take upstream |
| `src/server.ts` | upstream rewrote (−89), split into web/desktop servers | take upstream, then re-apply tool registration via new web `tools.ts` (see §D) |
| `src/restApiInstance.ts` | upstream +137/−88 reworked auth | take upstream; graft your additions only if a unique tool needs them |
| `src/index.ts` | upstream +83/−22 new entrypoint wiring | take upstream; re-add your export lines |
| `.gitignore` | trivial | union (keep both sets of lines) |
| `src/server/express.ts` | upstream +49/−18 | take upstream; graft your 11 lines if still needed |

## B. Merge both — your feature data lives here — 8 files

These carry your real REST/SDK additions and must keep **both** sides.

| File | Yours | Upstream | Action |
|------|-------|----------|--------|
| `src/sdks/tableau/methods/datasourcesMethods.ts` | +201 (`updateDatasourceData`) | +55 | keep upstream's new methods **and** your `updateDatasourceData` |
| `src/sdks/tableau/methods/workbooksMethods.ts` | +134 (download/publish) | +55 | keep both |
| `src/sdks/tableau/restApi.ts` | +95 (multipart/upload/hyper) | +208 (reworked) | apply yours on top of upstream's reworked base — **highest-care file** |
| `src/sdks/tableau/types/project.ts` | +4 | +21 | keep both fields |
| `src/sdks/tableau/types/user.ts` | +4 | +26 | keep both fields |
| `src/sdks/tableau/types/dataSource.ts` | +1 (`size`) | small | keep both |
| `src/sdks/tableau/types/site.ts` | +2 | small | keep both |
| `package.json` | +16 deps | +15/−3, version bump | take upstream version `2.15.1`, **union the dependencies**, keep your scripts only if their targets survive |

## C. add/add — both created the same path — 6 files

Upstream's versions are equal-or-larger and canonical. **Take upstream, graft any unique method of yours.**

| File | Yours / Upstream (lines) | Action |
|------|--------------------------|--------|
| `src/sdks/tableau/apis/projectsApi.ts` | 36 / 38 | take upstream; diff for any missing endpoint |
| `src/sdks/tableau/apis/tasksApi.ts` | 49 / 85 | take upstream |
| `src/sdks/tableau/apis/usersApi.ts` | 38 / 93 | take upstream |
| `src/sdks/tableau/methods/projectsMethods.ts` | 54 / 54 | diff carefully; take upstream, graft deltas |
| `src/sdks/tableau/methods/tasksMethods.ts` | 63 / 64 | take upstream, graft deltas |
| `src/sdks/tableau/methods/usersMethods.ts` | 54 / 94 | take upstream |

## D. modify/delete — upstream MOVED the file — 4 files

Your edits to all 3 tool files are the same pattern: add a `getSuccessResult` returning `structuredContent`. Upstream's tool wrapper supports `getSuccessResult` but **none of the moved tools implement it**. So your edits port cleanly — re-apply them onto the moved file.

| Your (deleted) path | Upstream's new home | Action |
|---------------------|--------------------|--------|
| `src/tools/contentExploration/searchContent.ts` | `src/tools/web/contentExploration/searchContent.ts` | re-apply your `getSuccessResult` block |
| `src/tools/queryDatasource/queryDatasource.ts` | `src/tools/web/queryDatasource/queryDatasource.ts` | re-apply your `getSuccessResult` block |
| `src/tools/views/getViewData.ts` | `src/tools/web/views/getViewData.ts` | re-apply your `getSuccessResult` + `parseCsvToStructured` helper |
| `src/server.test.ts` | split into `src/server.web.test.ts` / `src/server.desktop.test.ts` | **drop yours**, take upstream's split tests |

`src/tools/toolName.ts` (content conflict): upstream moved tool-name enums into `src/tools/web/toolName.ts`. Re-home your +40 new tool names there.

## E. Port your 11 unique tool dirs into `src/tools/web/`

Not in conflict (new paths) but they import from old locations and register via the old `tools.ts`. Each needs: move under `src/tools/web/`, fix imports to new SDK/method paths, register in `src/tools/web/tools.ts`.

```
download/                 listProjects/        runFlow/
publish/                  listFlows/           runExtractRefresh/
updateDatasourceData/     sites/               listExtractRefreshTasks/
listDatasources/ (modified)                    convertPngDataToToolResult.ts
```

⚠️ Check overlap: upstream already shipped `web/projects/`, `web/users/`, `web/extractRefreshTasks/`, `web/datasources/`, `web/workbooks/`. For `listProjects`, `sites`/`listUsers`, `listExtractRefreshTasks` — **diff against upstream's equivalents first**; prefer upstream's tool, port only genuinely missing capability (e.g. your download/publish/`updateDatasourceData`/`runFlow` look unique).

## F. MCP Apps — explicit decision required

Your `mcp-app/` (chart-explorer, content-browser, shared/dataExtraction), `src/mcpApps.ts`, and `docs/.../mcp-apps.md` overlap upstream's new `src/web/apps/` (embedTableauViz, getOAuthTokenToolClient). These are **different implementations of the same idea**.

Options:
- **(F1)** Adopt upstream's app model; drop your `mcp-app/` + `src/mcpApps.ts`; keep only your `getSuccessResult` structuredContent shapes (§D) if upstream's apps consume them. *Lowest maintenance.*
- **(F2)** Keep your chart-explorer/content-browser apps alongside upstream's; wire both. *More surface to maintain across future pulls.*

Recommend **F1** unless chart-explorer/content-browser are demoed features you rely on.

---

## Effort estimate

| Bucket | Files | Effort |
|--------|-------|--------|
| A take-upstream | 8 | low |
| B merge-both (restApi.ts is the crux) | 8 | medium-high |
| C add/add | 6 | low-medium |
| D re-home | 4 | low (clean ports) |
| E port unique tools | 11 dirs | medium-high (import fixups + dedup vs upstream) |
| F MCP Apps decision | — | a decision, then low or high per F1/F2 |

Half a day for A–D + lockfile + green build; the rest depends on how much of E/F you keep vs. cede to upstream.
