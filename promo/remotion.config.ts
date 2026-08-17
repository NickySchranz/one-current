import { Config } from "@remotion/cli/config";

// Reuse the Playwright-managed Chromium; render-all.mjs sets LD_LIBRARY_PATH
// so it finds the locally extracted NSS/X11 libraries.
Config.setBrowserExecutable(
  `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
);
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(24);
Config.setPixelFormat("yuv420p");
Config.setMuted(true);
Config.setChromiumOpenGlRenderer("swangle");
Config.setOverwriteOutput(true);
