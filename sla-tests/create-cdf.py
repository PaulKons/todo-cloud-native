import json
import os
import matplotlib.pyplot as plt

RAW_FILE = "sla-tests/results/high-raw.json"
OUT_FILE = "sla-tests/results/high-cdf.png"

durations = []

with open(RAW_FILE, "r", encoding="utf-8") as f:
    for line in f:
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue

        if item.get("type") == "Point" and item.get("metric") == "http_req_duration":
            value = item.get("data", {}).get("value")
            if value is not None:
                durations.append(float(value))

if not durations:
    raise SystemExit("No http_req_duration samples found.")

durations.sort()
cdf = [(i + 1) / len(durations) * 100 for i in range(len(durations))]

p95_index = int(0.95 * len(durations)) - 1
p99_index = int(0.99 * len(durations)) - 1

p95 = durations[p95_index]
p99 = durations[p99_index]

plt.figure(figsize=(8, 5))
plt.plot(durations, cdf)
plt.axhline(95, linestyle="--", linewidth=1)
plt.axhline(99, linestyle="--", linewidth=1)
plt.axvline(p95, linestyle="--", linewidth=1)
plt.axvline(p99, linestyle="--", linewidth=1)

plt.title("CDF of Backend Response Time - High Load Test")
plt.xlabel("Response time (ms)")
plt.ylabel("CDF (%)")
plt.grid(True)

plt.text(p95, 95, f" p95={p95:.2f}ms")
plt.text(p99, 99, f" p99={p99:.2f}ms")

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
plt.savefig(OUT_FILE, dpi=160, bbox_inches="tight")

print(f"Samples: {len(durations)}")
print(f"p95: {p95:.2f} ms")
print(f"p99: {p99:.2f} ms")
print(f"Saved CDF graph to: {OUT_FILE}")


