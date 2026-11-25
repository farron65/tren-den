"""Closed-loop load test: C virtual users each fire requests back-to-back for DURATION seconds.

usage: python loadtest.py <base_url> <out.json>
"""
import asyncio, json, os, random, statistics, sys, time
import httpx

BASE, OUT = sys.argv[1], sys.argv[2]
N_USERS = 20
WORKOUTS_PER_USER = 30
LEVELS = [10, 50, 100]
DURATION = 20.0
WARMUP = 3.0
EXERCISES = ["Bench Press", "Squat", "Deadlift", "Lat Pulldown", "Overhead Press", "Barbell Row"]


def workout_payload(rng, day):
    return {
        "workout_name": f"Day {day}",
        "date": f"2026-{1 + day // 28:02d}-{1 + day % 28:02d}T10:00:00Z",
        "exercises": [
            {"exercise_name": name, "rest_time": 180,
             "sets": [{"weight": rng.randint(50, 200), "reps": rng.randint(5, 12), "rest_time": 180} for _ in range(3)]}
            for name in rng.sample(EXERCISES, 4)
        ],
    }


async def seed(c):
    rng = random.Random(42)
    users = []
    for i in range(N_USERS):
        u = f"lt_user{i}"
        r = await c.post("/signup", json={"username": u, "email": f"{u}@example.com", "password": "pass1234"})
        assert r.status_code in (200, 409), r.text
        existed = r.status_code == 409
        tok = (await c.post("/login", data={"username": u, "password": "pass1234"})).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        ids = []
        for d in range(0 if existed else WORKOUTS_PER_USER):
            r = await c.post("/workouts", headers=h, json=workout_payload(rng, d))
            assert r.status_code == 200, r.text
            ids.append(r.json()["id"])
        users.append({"name": u, "headers": h, "ids": ids})
    return users


def make_scenarios(users):
    async def reads(c, rng):
        u = rng.choice(users)
        pick = rng.randrange(5)
        if pick == 0:
            return await c.get("/workouts", headers=u["headers"], params={"limit": 10})
        if pick == 1:
            return await c.get(f"/workouts/{rng.choice(u['ids'])}", headers=u["headers"])
        if pick == 2:
            return await c.get("/exercises/recent", headers=u["headers"])
        if pick == 3:
            return await c.get("/exercises/analytics/Bench Press", headers=u["headers"])
        return await c.get("/workouts/calendar", headers=u["headers"])

    async def login(c, rng):
        u = rng.choice(users)
        return await c.post("/login", data={"username": u["name"], "password": "pass1234"})

    async def writes(c, rng):
        u = rng.choice(users)
        return await c.post("/workouts", headers=u["headers"], json=workout_payload(rng, rng.randrange(300)))

    return {"reads": reads, "login": login, "writes": writes}


async def run_level(scenario, concurrency):
    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(base_url=BASE, timeout=60, limits=limits) as c:
        # latency/errors: every request that STARTED in the window, however long it took
        # throughput: successful requests that COMPLETED in the window
        latencies, errors, completed = [], 0, 0
        start = time.perf_counter()
        measure_from = start + WARMUP
        stop_at = measure_from + DURATION

        async def vu(i):
            nonlocal errors, completed
            rng = random.Random(i)
            while True:
                t0 = time.perf_counter()
                if t0 >= stop_at:
                    return
                try:
                    r = await scenario(c, rng)
                    ok = r.status_code < 400
                except Exception:
                    ok = False  # includes client timeouts (60s)
                t1 = time.perf_counter()
                if ok and measure_from <= t1 <= stop_at:
                    completed += 1
                if t0 >= measure_from:
                    if ok:
                        latencies.append((t1 - t0) * 1000)
                    else:
                        errors += 1

        await asyncio.gather(*(vu(i) for i in range(concurrency)))

    lat = sorted(latencies)
    # only called when lat is non-empty (every use below is guarded by `if lat`)
    q = lambda p: lat[min(len(lat) - 1, int(p * len(lat)))]
    return {
        "requests": len(lat), "errors": errors, "rps": round(completed / DURATION, 1),
        "p50": round(q(0.50), 1) if lat else None, "p95": round(q(0.95), 1) if lat else None,
        "p99": round(q(0.99), 1) if lat else None, "max": round(lat[-1], 1) if lat else None,
        "mean": round(statistics.mean(lat), 1) if lat else None,
    }


async def main():
    async with httpx.AsyncClient(base_url=BASE, timeout=60) as c:
        t = time.perf_counter()
        users = await seed(c)
        print(f"seeded {N_USERS} users x {WORKOUTS_PER_USER} workouts in {time.perf_counter() - t:.1f}s", flush=True)
    results = {}
    only = os.environ.get("SCENARIOS")
    for name, fn in make_scenarios(users).items():
        if only and name not in only.split(","):
            continue
        for level in LEVELS:
            res = await run_level(fn, level)
            results[f"{name}@{level}"] = res
            print(name, level, res, flush=True)
    json.dump(results, open(OUT, "w"), indent=2)


asyncio.run(main())
