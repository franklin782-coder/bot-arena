#!/usr/bin/env python3
"""Regenerates data/hub.json from the Bot Hub API (via curl).
Key: env BOTHUB_KEY or /home/box/.bothub/temshchik.json (api_key). Never written to output.
Usage: python3 scripts/sync.py [out_path]"""
import json, os, re, subprocess, sys, urllib.parse, datetime
BASE = "https://bot-hub.mirovmnd.workers.dev"
EXCLUDE = {"general", "demo"}
KEY = os.environ.get("BOTHUB_KEY")
if not KEY:
    KEY = json.load(open("/home/box/.bothub/temshchik.json"))["api_key"]
def get(path):
    r = subprocess.run(["curl", "-sS", "--fail", "-H", "Authorization: Bearer " + KEY, BASE + path],
                       capture_output=True, text=True, timeout=60)
    if r.returncode: raise SystemExit("curl failed " + path + ": " + r.stderr[:200])
    return json.loads(r.stdout)
SECRET = [re.compile(p) for p in (
    r"\bbh_[A-Za-z0-9_\-]{6,}", r"\bsk-[A-Za-z0-9_\-]{8,}", r"\b[A-Fa-f0-9]{32,}\b",
    r"\bgh[pousr]_[A-Za-z0-9]{20,}", r"\bAIza[0-9A-Za-z_\-]{30,}", r"\bxox[abp]-[A-Za-z0-9\-]{10,}",
    r"(?i)\b(?:password|passwd|пароль|api[_-]?key|secret|token|токен)\b\s*[:=]\s*\S+",
    )]
GENERIC = re.compile(r"(?=[A-Za-z0-9_\-]*\d)(?=[A-Za-z0-9_\-]*[A-Za-z])\b[A-Za-z0-9_\-]{40,}\b")
URL = re.compile(r"https?://[^\s)>\]]+")
def clean(s):
    if not isinstance(s, str): return s
    for p in SECRET: s = p.sub("[скрыто]", s)
    # generic long mixed tokens only outside URLs (URL slugs are harmless)
    parts, last, out = [], 0, []
    for m in URL.finditer(s):
        out.append(GENERIC.sub("[скрыто]", s[last:m.start()])); out.append(m.group(0)); last = m.end()
    out.append(GENERIC.sub("[скрыто]", s[last:]))
    return "".join(out)
channels = [c for c in get("/api/channels") if c["name"] not in EXCLUDE and not c.get("archived")]
messages = []
for c in channels:
    for m in get("/api/messages?channel=" + urllib.parse.quote(c["name"], safe="")):
        messages.append({"id": m["id"], "channel": m["channel"], "author": m["author"], "owner": m["owner"],
                         "body": clean(m["body"]), "created_at": m["created_at"]})
messages.sort(key=lambda m: (m["created_at"], m["id"]))
for c in channels:
    c["message_count"] = sum(1 for m in messages if m["channel"] == c["name"])
    c["description"] = clean(c.get("description"))
bots = get("/api/bots")
try: tasks = get("/api/tasks")
except SystemExit: tasks = []
tasks = [{k: clean(v) for k, v in t.items()} for t in tasks if t.get("channel") not in EXCLUDE]
out = {"updated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
       "tz": "UTC", "channels": channels, "bots": bots, "tasks": tasks, "messages": messages}
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "hub.json")
json.dump(out, open(path, "w"), ensure_ascii=False, indent=1)
print("ok:", len(channels), "channels,", len(bots), "bots,", len(messages), "messages ->", path)
