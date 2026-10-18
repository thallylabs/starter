# Thally Starter

A production-ready documentation site built with the open-source Thally runtime.
Use this repository as a GitHub template or clone it directly, then replace the
starter content with documentation for your product.

Thally is the product knowledge layer for software teams. This starter is its
portable publishing foundation: your content stays in Git, and the same source
can serve people, search engines, and AI tools.

This is the canonical complete template consumed by Thally Cloud, the CLI, and
the MCP server. Runtime code is authored once in
[`thallylabs/thally`](https://github.com/thallylabs/thally), then generated into
this repository as a pinned, byte-identical snapshot. Do not manually repeat a
runtime fix in both repositories.

This README covers the portable starter, not the full managed platform. The
sole production architecture authority is
[`thally-cloud/ARCHITECTURE.md`](https://github.com/thallylabs/thally-cloud/blob/main/ARCHITECTURE.md),
available to maintainers with access to the private repository. The CLI, MCP,
and Cloud creation flows consume an exact promoted scaffold release rather
than treating the mutable `main` branch as a release identity.

## Create a site

Use the CLI to create a new site with Tailwind CSS 4:

```bash
npx create-thally-docs@latest my-docs
cd my-docs
npx thally dev
```

If you need Tailwind CSS 3, use `--tailwind-version 3`:

```bash
npx create-thally-docs@latest my-docs-3 --tailwind-version 3
```

The flag selects a fixed starter snapshot with its matching framework,
configuration, and lockfile. It applies to new sites. Cloning this repository
uses the version in the branch you clone.

## Run locally

```bash
npm install
npx thally dev
```

Open [http://localhost:3040](http://localhost:3040). The next available port is
used automatically when 3040 is occupied. `npm run dev` starts the same server.

The `thally` CLI is a dev dependency of this site. Once the preview is ready,
`thally dev` prints the local agent endpoints (`/llms.txt`, `/api/mcp`) and a
`claude mcp add --transport http` command for connecting Claude Code. Run
`npx thally --help` for the other commands, such as `thally new`,
`thally check`, and `thally deploy`.

## Make it yours

- Edit pages in `src/content/`.
- Organize navigation and features in `docs.json`.
- Set the product name, links, and versioned brand defaults in `src/data/site.ts`.
- Replace `openapi.yaml` with your API specification.
- Add logos or favicons in `public/` and reference them from your site settings.

## Update the framework

Run the current CLI from your project root to review an update:

```bash
npx @thallylabs/cli@latest starter update
```

The command compares your project with its original framework and the latest
release. It preserves your content and settings. If you edited framework files
or dependencies, resolve any conflicts shown in the plan before you apply it:

```bash
npx @thallylabs/cli@latest starter update --apply
npm ci
```

Keep `starter-release.json` in your repository. The updater uses it to identify
your current framework. Do not change its version by hand.

For a Tailwind 3 site, follow the
[Tailwind CSS 4 upgrade guide](https://github.com/thallylabs/thally/blob/main/docs/tailwind-v4-upgrade.md)
to review your own CSS utilities after the framework update. You can keep your
current site and lockfile if you still need Tailwind 3.

Maintainers update the generated runtime snapshot through the **Sync Thally
runtime** workflow. CI rejects a changed pin without matching files, changed
files without a matching pin, missing files, and stale runtime files.

Content icons are neutral by default. Set `appearance.contentIcons` to `accent`
in `docs.json`, or add `iconColor="accent"` to an individual card or tile.
Public page URLs ending in `.md` are disabled by default; enable them explicitly
with `markdown.enabled` when that distribution surface fits your access model.

## Validate changes

```bash
npx thally check
npm test
npm run build
```

CI runs the same content check with the pinned workflow tooling:
`npm ci --ignore-scripts --prefix .github/thally-tooling`, then
`.github/thally-tooling/node_modules/.bin/thally check --ci .`.

## Deploy

The site is a standard Next.js application. Deploy it through Thally Cloud or
any compatible Next.js host. Cloudflare Workers configuration is included in
`open-next.config.ts` and `wrangler.jsonc`.

Thally Cloud publishes an immutable managed site release and activates it by
moving the site's production pointer only after validation. Direct hosts use
their own release and rollback mechanisms; publishing a package or synchronizing
this starter does not move an existing site's pointer.

On Vercel, the site URL used for canonical and agent links is detected
automatically. On other hosts, for a custom domain, or on Cloudflare Workers,
set `THALLY_SITE_URL` in your host's environment.

Copy `.env.example` to `.env.local` only when you need optional services. Never
commit real credentials.

## License

[MIT](LICENSE)
