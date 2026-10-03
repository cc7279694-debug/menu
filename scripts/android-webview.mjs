// Test utility for an explicitly selected emulator. Never controls a physical phone.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
export const packageName = "app.recipio.local";
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export function device(adbPath, serial) {
  assert(serial?.startsWith("emulator-"), "Explicit emulator serial required");
  function raw(...args) {
    const result = spawnSync(adbPath, ["-s", serial, ...args], { timeout: 30000 });
    assert.equal(result.status, 0, result.stderr.toString() || result.stdout.toString());
    return result.stdout;
  }
  const adb = (...args) => raw(...args).toString().trim();
  let socket;
  let forwardedPort;
  let seq = 0;
  const events = [];
  async function command(method, params = {}) {
    const id = ++seq;
    return new Promise((resolveResult, reject) => {
      const timer = setTimeout(() => {
        socket.removeEventListener("message", receive);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      const receive = (event) => {
        const value = JSON.parse(event.data);
        if (value.id !== id) return;
        clearTimeout(timer);
        socket.removeEventListener("message", receive);
        if (value.error) reject(new Error(JSON.stringify(value.error)));
        else resolveResult(value.result);
      };
      socket.addEventListener("message", receive);
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(`Native assertion timed out: ${expression}\n${await evaluate("document.body.innerText")}`);
  }
  async function connect() {
    socket?.close();
    if(forwardedPort) { adb("forward","--remove",`tcp:${forwardedPort}`); forwardedPort=undefined; }
    let pid;
    for (let i=0; i<50; i++) {
      const found=spawnSync(adbPath,["-s",serial,"shell","pidof",packageName],{timeout:30000});
      pid=found.stdout.toString().trim().split(" ")[0];
      if(found.status===0 && pid) break;
      await delay(150);
    }
    assert(pid, "App process missing");
    forwardedPort=adb("forward", "tcp:0", `localabstract:webview_devtools_remote_${pid}`);
    assert(/^\d+$/.test(forwardedPort),"ADB did not allocate a debug port");
    let pages;
    for (let i = 0; i < 200; i++) {
      try { pages = await (await fetch(`http://127.0.0.1:${forwardedPort}/json`,{signal:AbortSignal.timeout(2000)})).json(); } catch { /* endpoint starts asynchronously */ }
      if (pages?.length) break;
      await delay(150);
    }
    assert(pages?.length, "Installed APK WebView unavailable");
    socket = new WebSocket(pages[0].webSocketDebuggerUrl);
    await new Promise((r, reject) => { socket.onopen = r; socket.onerror = reject; });
    socket.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.method) events.push(m);
    });
    await command("Runtime.enable");
    await command("Network.enable");
    await wait("!!document.body && document.readyState!=='loading'");
  }
  async function coldStart() {
    socket?.close();
    adb("shell", "am", "force-stop", packageName);
    adb("shell", "am", "start", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER", "-n", `${packageName}/.MainActivity`);
    await delay(1200);
    await connect();
    await wait("!!document.querySelector('[aria-label=\"新增菜谱\"]') || !!document.querySelector('[role=alert]')");
  }
  async function click(label) {
    await wait(`(() => {const b=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true;})()`);
    await delay(100);
  }
  async function fill(label, value) {
    await evaluate(`(() => { const l=[...document.querySelectorAll('label')].find(l=>(l.querySelector('span')?.textContent.trim()||l.textContent.trim())===${JSON.stringify(label)});const el=l?.querySelector('input,textarea');if(!el)throw new Error('Input absent: '+${JSON.stringify(label)});const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await delay(60);
  }
  async function screenshot(path) {
    mkdirSync(resolve("artifacts/android-daily"), { recursive: true });
    writeFileSync(path, raw("exec-out", "screencap", "-p"));
  }
  async function snapshot(name) {
    socket?.close();
    adb("shell", "am", "force-stop", packageName);
    const path = resolve("artifacts/android-daily", name);
    mkdirSync(resolve("artifacts/android-daily"), { recursive: true });
    writeFileSync(path, raw("exec-out", "run-as", packageName, "cat", "databases/recipioSQLite.db"));
    return path;
  }
  function close() {
    socket?.close();
    if (forwardedPort) { adb("forward", "--remove", `tcp:${forwardedPort}`); forwardedPort=undefined; }
  }
  return { adb, raw, connect, coldStart, evaluate, wait, command, click, fill, screenshot, snapshot, close, events };
}
