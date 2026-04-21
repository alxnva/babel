// Single bundled entry for esbuild.
//
// Each module attaches to window.BabelSite as a side effect when imported.
// Order matters: textures.js and scene/index.js read helpers, palette, world,
// quality, and visibility off of site.scene at their own import time, so the
// dependencies must have already run. main.js goes last because it reads
// site.ui and site.scene to boot the page.
import "./scene/helpers.js";
import "./scene/palette.js";
import "./scene/world.js";
import "./scene/quality.js";
import "./scene/visibility.js";
import "./scene/textures.js";
import "./scene/index.js";
import "./ui/hero.js";
import "./ui/icons.js";
import "./ui/panels.js";
import "./ui/scene-tuner.js";
import "./main.js";
