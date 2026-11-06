# Madaraka Express

A responsive Madaraka Express site built with React, TypeScript, Next.js App Router, and Tailwind CSS. The passenger booking and administration flows come from `madaraka-railways-demo`; their Express API runs behind the Next.js site.

## Development

Requires Node.js 20.9 or later.

```sh
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site. `bun run dev` starts both the Next.js site and the passenger API. Next.js serves the API through local rewrites, so the passenger pages share the homepage URL and header.

## Production

```sh
bun run build
bun run start
```

Homepage images are stored in `public/images`. The homepage and booking entry point are in `src/components/MadarakaHome.tsx`; the shared shell for the imported passenger pages is in `src/components/PortalExperience.tsx`.

The imported booking system still uses sample schedules and simulated payments. It is suitable for local review, not for issuing real Kenya Railways tickets or accepting payments.
