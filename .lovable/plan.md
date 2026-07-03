# Fix: "تعذّر الاتصال بنواة الذكاء" (server functions returning 500)

## Root cause

`vite.config.ts` sets `vite: { base: "./" }` (originally added for Electron `file://` builds).

TanStack Start uses that `base` to build `TSS_SERVER_FN_BASE`, so it becomes `./_serverFn/` instead of `/_serverFn/`.

- The client generates URLs like `./_serverFn/<hash>`, which the browser resolves to `/./_serverFn/<hash>` (visible in the network log).
- The server normalizes the pathname to `/_serverFn/<hash>` and checks `pathname.startsWith('./_serverFn/')` — this fails.
- The request falls through to the page router, whose `Accept`-header check rejects it with `{"error":"Only HTML requests are supported here"}` and status 500.

Result: every `createServerFn` call (including `askNawat`) fails, and the chat shows "تعذّر الاتصال بنواة الذكاء. حاول مجدداً."

## Change

Edit `vite.config.ts`: remove the `vite: { base: "./" }` block. This project is a Lovable web app served from `/`, not an Electron `file://` build, so relative base is not needed and actively breaks server functions.

```ts
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

## Verify

1. Reload the preview.
2. Send an Arabic question in the chat (e.g. "مواقعي").
3. Expect a 200 response from `/_serverFn/<hash>` and a real answer rendered, no toast error.
4. Network tab: request path should be `/_serverFn/...` (no leading `/./`).
