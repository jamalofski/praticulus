# Contributing to Praticulus

Thanks for your interest. Praticulus rests on two promises: every tool runs entirely in the browser, and nothing tracks the user. Contributions are welcome as long as they keep both.

## Ground rules

A tool is accepted only if it:

- runs **100% client-side**, with no request to any server for the user's data;
- adds **no tracking** of any kind (no analytics, cookies, pixels, or fingerprinting);
- makes **no network call** except to a self-hosted asset or to a third-party library already used in the repository;
- holds the performance budget: **Lighthouse ≥ 95** on Performance, Best Practices, Accessibility, and SEO.

Pull requests that add a CDN, a tracker, or an external data call are not merged automatically and will be discussed first.

## Adding a tool

Each tool is a single self-contained page:

```
<tool-slug>/index.html
```

Use an existing tool such as `base64/` or `json-formatter/` as a template. Keep the markup, the shared CSS classes, and the privacy posture consistent with the rest of the site. Logic is inline or in self-hosted JavaScript, with no build step, so you can open the file in a browser and iterate directly.

## Style

- No inline `onclick`; wire events in JavaScript.
- No unused CSS classes, and one `@media` block per breakpoint.
- System font stack by default.
- Plain, factual English copy, with no marketing filler.

## Proposing an idea

If you are unsure a tool fits, open an issue describing what it does and why it belongs in a privacy-first toolbox. That is the best place to start.
