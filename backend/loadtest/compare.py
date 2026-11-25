"""Prints side-by-side tables for two result files.

usage: python compare.py <before.json> <after.json>
   e.g. python compare.py results/results_sync.json results/results_async.json
"""
import json, sys

sync = json.load(open(sys.argv[1]))
asyn = json.load(open(sys.argv[2]))

DESC = {
    "reads": "READS  - GET /workouts, /workouts/{id}, /workouts/calendar, /exercises/recent, /exercises/analytics/{name}",
    "login": "LOGIN  - POST /login (bcrypt password check)",
    "writes": "WRITES - POST /workouts (4 exercises x 3 sets)",
}


def fmt(v, unit=""):
    if v == "DEADLOCK":
        return v
    if isinstance(v, int):
        return str(v)
    return "-" if v is None else f"{v:,.0f}{unit}" if v >= 100 else f"{v:,.1f}{unit}"


def ratio(a, b, higher_is_better):
    if not a or not b:
        return ""
    r = b / a if higher_is_better else a / b
    return f"{r:.1f}x better" if r >= 1.05 else (f"{1 / r:.1f}x worse" if r <= 0.95 else "same")


lines = []
for scen in ["reads", "login", "writes"]:
    if not any(k.startswith(scen + "@") and k in asyn for k in sync):
        continue
    lines.append(DESC[scen])
    lines.append(f"  {'users':>5} | {'metric':<12} | {'before':>10} | {'after':>10} | change")
    lines.append("  " + "-" * 62)
    for key in [k for k in sync if k.startswith(scen + "@") and k in asyn]:
        level = key.split("@")[1]
        a, b = dict(sync[key]), dict(asyn[key])
        for d in (a, b):
            if d["requests"] == 0:  # nothing completed: server stuck
                d["rps"] = "DEADLOCK"
        rows = [
            ("req/sec", a["rps"], b["rps"], True, ""),
            ("p50 latency", a["p50"], b["p50"], False, " ms"),
            ("p95 latency", a["p95"], b["p95"], False, " ms"),
            ("p99 latency", a["p99"], b["p99"], False, " ms"),
            ("errors", int(a["errors"]), int(b["errors"]), None, ""),
        ]
        for i, (m, x, y, hib, unit) in enumerate(rows):
            change = ratio(x, y, hib) if hib is not None and "DEADLOCK" not in (x, y) else ""
            lines.append(f"  {level if i == 0 else '':>5} | {m:<12} | {fmt(x, unit):>10} | {fmt(y, unit):>10} | {change}")
        lines.append("  " + "-" * 62)
    lines.append("")

print("\n".join(lines))
