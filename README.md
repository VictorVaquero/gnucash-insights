# Cashpy

Vite not working? Delete node_modules, run

> pnpm
> pnpm add -D vite

A little tab down should be able to relaunch vite, open the server... Also to run server command directly in local do:

> pnpm run vite

## Stories

For the initial setup

> pnpm storybook init

To run the server

> pnpm storybook

## Deploy

The app deploys via **Vercel**, connected to this GitHub repo — pushing to the default
branch triggers a production deploy automatically; every other branch/PR gets its own
preview deployment. There is no manual build-then-upload step and no separate deploy
script to run.

It's served at [victorvaquero.com/dashboard](https://victorvaquero.com/dashboard) as its
own independent Vercel project. The `resumeweb` repo (which owns the `victorvaquero.com`
domain) has a `rewrites` rule in its `vercel.json` that proxies `/dashboard/*` to this
project's Vercel deployment URL — see that repo for details. Rolling back the dashboard
specifically only requires reverting a deploy here; rolling back the domain mounting
requires a change in `resumeweb`.

`vercel.json` in this repo sets security response headers (CSP, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy) and the SPA fallback rewrite that lets
client-side routes (e.g. `/dashboard/summary`) resolve on direct load/refresh.

### Legacy: AWS (S3 + CloudFront)

Before Vercel, this app deployed to the `victorvaquero.dashboard.net` S3 bucket fronted by
CloudFront (distribution `E5ZMBYGUCPRWJ`), via manual `aws s3 sync` +
`cloudfront create-invalidation` commands. Those scripts have been removed from
`package.json`. That infrastructure is scheduled for decommission now that Vercel hosting
is verified working; until then it remains live but unused — tearing it down needs to
happen separately in the AWS console/CLI, outside this repo. (The `victor-mycash` S3
bucket that stores the actual financial data files is unrelated and unaffected.)
