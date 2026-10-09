#!/usr/bin/env python3
"""
Export the clean PowerTech dataset to the JSON shape the dashboard bundles:
  { meta: {...}, sites: [...], dailyTotals: [...] }
(the Boulder object `{meta:G5, sites:H5, dailyTotals:j5}` in the current build).
Coordinates and display names come from the stations_canonical sheet.

Usage: python export_dashboard_json.py PowerTech_synthetic_dataset.xlsx [out.json]
"""
import json
import re
import sys

import numpy as np
import pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else "PowerTech_synthetic_dataset.xlsx"
OUT = sys.argv[2] if len(sys.argv) > 2 else "powertech_boulder_dashboard.json"

def revenue(dwell_h):
    """City of Boulder L2 tariff: $1/h for 0-2 h, $2.50/h for 2-4 h, capped at 4 h."""
    h = np.clip(dwell_h, 0, None)
    return np.minimum(h, 2) * 1.0 + np.clip(np.minimum(h, 4) - 2, 0, None) * 2.5


def main():
    s = pd.read_excel(SRC, sheet_name="sessions_enriched")
    st = pd.read_excel(SRC, sheet_name="stations_canonical")
    s["rev"] = revenue(s["dwell_h"].fillna(0))
    s["dow_sun0"] = (s["start"].dt.dayofweek + 1) % 7          # Sunday = 0, as in the dashboard
    s["heat_idx"] = s["dow_sun0"] * 24 + s["start"].dt.hour

    # ---- sites -------------------------------------------------------------
    sites, used_ids = [], set()
    for _, r in st.sort_values("sessions", ascending=False).iterrows():
        g = s[s["station_id"] == r["station_id"]]
        base = "BLDR-" + re.sub(r"[^A-Z0-9]", "", r["canonical_name"].upper())
        sid = base
        if sid in used_ids:                                   # same name at another address
            sid = base + "-" + re.sub(r"\D", "", str(r["address"]))[:5]
        used_ids.add(sid)
        lat, lng = float(r["lat"]), float(r["lng"])
        heat = (g.groupby("heat_idx")["energy_kWh"].sum()
                 .reindex(range(168), fill_value=0).round().astype(int).tolist())
        dwell = g["dwell_h"].sum()
        sites.append({
            "id": sid,
            "name": r["display_name"],
            "address": r["address"],
            "city": "Boulder",
            "zip": str(int(r["zip"])),
            "lat": lat, "lng": lng,
            "connectorTypes": ["J1772"],
            "numPorts": int(r["n_ports"]),
            "sessions": int(len(g)),
            "energyKwh": int(round(g["energy_kWh"].sum())),
            "co2Kg": int(round(g["ghg_savings_kg"].sum())),
            "gasolineGal": int(round(g["gasoline_savings_gal"].sum())),
            "revenue": int(round(g["rev"].sum())),
            "avgDurationMin": int(round(g["dwell_h"].mean() * 60)),
            "utilizationPct": int(round(100 * g["charging_h"].sum() / dwell)) if dwell > 0 else 0,
            "heat": heat,
        })

    # ---- dailyTotals -----------------------------------------------------------
    s["date"] = s["start"].dt.normalize()
    d = s.groupby("date").agg(sessions=("session_id", "size"), energyKwh=("energy_kWh", "sum"),
                              chargeMin=("charging_h", "sum"), durMin=("dwell_h", "sum"))
    # days without any session are omitted, as in the original dashboard build
    daily = [{"date": dt.strftime("%Y-%m-%d"), "sessions": int(r.sessions),
              "energyKwh": int(round(r.energyKwh)), "chargeMin": int(round(r.chargeMin * 60)),
              "durMin": int(round(r.durMin * 60))} for dt, r in d.iterrows()]

    # ---- meta -------------------------------------------------------------------
    meta = {
        "source": "City of Boulder open data — EV charging sessions (de-duplicated: 77,935 unique sessions)",
        "ratePerKwh": 0.3,
        "revenueModel": "City of Boulder L2 tariff: $1/hr (0-2h), $2.50/hr (2-4h), 4h cap",
        "sessions": int(len(s)),
        "energyKwh": int(round(s["energy_kWh"].sum())),
        "co2Kg": int(round(s["ghg_savings_kg"].sum())),
        "gasolineGal": int(round(s["gasoline_savings_gal"].sum())),
        "revenue": int(round(s["rev"].sum())),
        "avgDurationMin": int(round(s["dwell_h"].mean() * 60)),
        "utilizationPct": int(round(100 * s["charging_h"].sum() / s["dwell_h"].sum())),
        "dateStart": "2018-01-01",
        "dateEnd": "2023-11-30",
    }
    out = {"meta": meta, "sites": sites, "dailyTotals": daily}

    # ---- checks -----------------------------------------------------------------
    assert len({x["id"] for x in sites}) == len(sites), "duplicate site ids"
    assert sum(x["sessions"] for x in sites) == meta["sessions"]
    assert sum(x["sessions"] for x in daily) == meta["sessions"]
    assert all(len(x["heat"]) == 168 for x in sites)
    assert abs(sum(x["energyKwh"] for x in sites) - meta["energyKwh"]) <= len(sites)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(meta, indent=1, ensure_ascii=False))
    print(f"sites {len(sites)}, dailyTotals {len(daily)}")


if __name__ == "__main__":
    main()
