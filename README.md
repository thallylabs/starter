# Thally Starter

A production-ready documentation site built with the open-source Thally runtime.
Use this repository as a GitHub template or clone it directly, then replace the
starter content with documentation for your product.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3040](http://localhost:3040). The next available port is
used automatically when 3040 is occupied.

## Make it yours

- Edit pages in `src/content/`.
- Organize navigation and features in `docs.json`.
- Set the product name, links, and versioned brand defaults in `src/data/site.ts`.
- Replace `openapi.yaml` with your API specification.
- Add logos or favicons in `public/` and reference them from your site settings.

`starter-release.json` records the immutable starter and runtime version used
to create the site. Keep it in the repository so `thally starter update` can
plan framework updates without overwriting your content or portable settings.

Content icons are neutral by default. Set `appearance.contentIcons` to `accent`
in `docs.json`, or add `iconColor="accent"` to an individual card or tile.
Public page URLs ending in `.md` are disabled by default; enable them explicitly
with `markdown.enabled` when that distribution surface fits your access model.

## Validate changes

```bash
npm test
npm run build
npx thally check --ci .
```

## Deploy

The site is a standard Next.js application. Deploy it through Thally Cloud or
any compatible Next.js host. Cloudflare Workers configuration is included in
`open-next.config.ts` and `wrangler.jsonc`.

Copy `.env.example` to `.env.local` only when you need optional services. Never
commit real credentials.

## License

[MIT](LICENSE)
