#!/bin/sh
# Deterministic re-render of the diagrams in this post.
#
# Renders each .mmd twice: light (neutral theme, baked #efefef background)
# and dark (dark theme, transparent background), then fixes the autonumber
# chips (light: #333 chip/white digits; dark: #1f2020 chip/pale digits).
#
# mermaid-cli is fetched on demand by npx (no local dependency install;
# the version pin keeps output stable between runs). The first run
# downloads a headless browser (puppeteer) into the npx cache; after
# that, rendering is offline and repeatable.
#
# Usage:
#   sh render.sh
#
# The blog page picks the correct variant with <picture> and
# media="(prefers-color-scheme: dark)"; browsers without <picture> support
# receive the light variant via the <img src>.
set -eu

MMDC="npx --yes @mermaid-js/mermaid-cli@12.0.0"

IMAGES_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

render() {
	mmd_file="$1"
	base="$(basename "$mmd_file" .mmd)"

	$MMDC -i "$mmd_file" -o "$IMAGES_DIR/$base-light.svg" -t neutral -b transparent
	$MMDC -i "$mmd_file" -o "$IMAGES_DIR/$base-dark.svg" -t dark -b transparent

	python3 - "$IMAGES_DIR" "$base" <<'PYEOF'
import re, sys

images_dir, base = sys.argv[1], sys.argv[2]
variants = (
    (f"{images_dir}/{base}-light.svg", "#efefef", "#333333", "#965ac8", "white"),
    (f"{images_dir}/{base}-dark.svg", "transparent", "#1f2020", "#c19cdf", "#efefef"),
)
marker = '<marker id="my-svg-sequencenumber" refX="15" refY="15" markerWidth="60" markerHeight="40" orient="auto"><circle cx="15" cy="15" r="6"/></marker>'
for path, background, chip, ring, digits in variants:
    s = open(path).read()
    if background == "transparent":
        s = s.replace("background-color: #efefef;", "background-color: transparent;")
    else:
        s = s.replace("background-color: transparent;", f"background-color: {background};")
    fixed = marker.replace(
        '<circle cx="15" cy="15" r="6"/>',
        f'<circle cx="15" cy="15" r="6" fill="{chip}" stroke="{ring}" stroke-width="1"/>',
    )
    assert marker in s, f"autonumber chip marker not found in {path}"
    s = s.replace(marker, fixed)
    s = re.sub(r"(\.sequenceNumber\{)fill:[^;}]*", rf"\g<1>fill:{digits}", s)
    open(path, "w").write(s)
    print(f"post-processed {path} (background {background}, chip {chip})")
PYEOF
}

cd "$IMAGES_DIR"
for mmd in ./*.mmd; do
	render "$mmd"
done
echo "Done. Committed outputs: ./*-light.svg and ./*-dark.svg"