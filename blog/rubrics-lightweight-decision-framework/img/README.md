# Diagram assets — rubrics-lightweight-decision-framework post

- `too-wide.mmd`, `good.mmd` — mermaid `sequenceDiagram` sources (the worked example from the post).
- `*-light.svg`, `*-dark.svg` — committed rendered outputs. Light variant is neutral theme with a baked `#efefef` background (the page's card colour); dark variant is the dark theme on a transparent background.
- The blog page uses `<picture><source media="(prefers-color-scheme: dark)">` to pick the variant, matching how GitHub handles schematic dark/light diagrams.
- `render.sh` — deterministic re-render script (see its header comment for usage). Rendering was done with `@mermaid-js/mermaid-cli` 12.0.0, invoked via `npx` (`npx --yes @mermaid-js/mermaid-cli@12.0.0`) so no local dependency install is needed; the repo keeps zero diagram/JS dependencies.