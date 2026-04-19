import { app as n, BrowserWindow as r } from "electron";
import e from "node:path";
import { fileURLToPath as c } from "node:url";
const t = e.dirname(c(import.meta.url));
process.env.APP_ROOT = e.join(t, "..");
const i = process.env.VITE_DEV_SERVER_URL, R = e.join(process.env.APP_ROOT, "dist-electron"), s = e.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = i ? e.join(process.env.APP_ROOT, "public") : s;
let o;
function p() {
  o = new r({
    width: 1200,
    height: 800,
    icon: e.join(process.env.VITE_PUBLIC, "app-icon.png"),
    autoHideMenuBar: !0,
    /* This removes the default File Edit View Window menu bar */
    webPreferences: {
      preload: e.join(t, "preload.mjs")
    }
  }), i ? o.loadURL(i) : o.loadFile(e.join(s, "index.html"));
}
n.on("window-all-closed", () => {
  process.platform !== "darwin" && (n.quit(), o = null);
});
n.on("activate", () => {
  r.getAllWindows().length === 0 && p();
});
n.whenReady().then(p);
export {
  R as MAIN_DIST,
  s as RENDERER_DIST,
  i as VITE_DEV_SERVER_URL
};
