#!/usr/bin/env python3
"""
Export the operations data behind the Infrastructure Planning, Sustainability
and Fault Diagnostics pages to src/data/boulder-ops.json.

Reads the team workbook (PowerTech_synthetic_dataset.xlsx) and the 15-minute
power profile beside it. Session, energy and emissions figures are real City of
Boulder data; ports, maintenance, telemetry and failed visits are synthetic
(see the workbook's data_dictionary), and the JSON marks which is which.

The fault probabilities come from the FR-02 model, trained exactly as in
fr02_evaluation.py (LightGBM, 7-day horizon, trained on 2018-2020, threshold
set on 2021 for 70% recall, tested on 2022-2023), then scored on the last day
of data.

Usage:
  python scripts/export_ops_json.py PowerTech_synthetic_dataset.xlsx \
      power_profile_15min.csv.gz [src/data/boulder-ops.json]
"""
import json
import sys
import warnings

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, roc_auc_score

warnings.filterwarnings("ignore")

SRC = sys.argv[1] if len(sys.argv) > 1 else "PowerTech_synthetic_dataset.xlsx"
PROFILE = sys.argv[2] if len(sys.argv) > 2 else "power_profile_15min.csv.gz"
OUT = sys.argv[3] if len(sys.argv) > 3 else "src/data/boulder-ops.json"
SITES_JSON = "src/data/boulder-data.json"

END = pd.Timestamp("2023-11-30")
LAST_12M = (pd.Timestamp("2022-12-01"), pd.Timestamp("2023-12-01"))
PREV_12M = (pd.Timestamp("2021-12-01"), pd.Timestamp("2022-12-01"))
ACTIVE_SINCE = pd.Timestamp("2023-06-01")   # a port with no session since then is retired
AGEING_YEARS = 8                            # L2 EVSE service life is typically ~10 years
TARGET_OCCUPANCY = 0.20                     # plugged-in share of port-hours we plan to
MIN_PREV_SESSIONS = 50                      # below this, year-on-year growth is not meaningful
MAX_GROWTH = 1.0                            # growth is capped at +100% for scoring and sizing
MCDA_WEIGHTS = {"occupancy": 0.35, "growth": 0.25, "peakLoad": 0.25, "downtime": 0.15}
H = 7                                       # FR-02 horizon, days
SIG = ["connector_warnings", "trip_events", "auth_failures", "comm_dropouts"]


def iso(ts):
    return None if pd.isna(ts) else pd.Timestamp(ts).strftime("%Y-%m-%dT%H:%M")


def day(ts):
    return None if pd.isna(ts) else pd.Timestamp(ts).strftime("%Y-%m-%d")


def rnd(x, n=1):
    return None if x is None or pd.isna(x) else round(float(x), n)


def minmax(s):
    span = s.max() - s.min()
    return (s - s.min()) / span if span else s * 0


# ---- FR-02 features, as in fr02_evaluation.py, extended to the last day ----
def fr02_features(s, ev, pi, tel):
    s = s.copy()
    s["d"] = s.start.dt.normalize()
    fail = ev[ev.is_failure]
    out = []
    for _, p in pi.iterrows():
        ss = s[s.port_id == p.port_id]
        days = pd.date_range(p.first_session.normalize() + pd.Timedelta(days=28), END, freq="D")
        if len(days) == 0:
            continue
        rng_days = pd.date_range(p.first_session.normalize(), END)
        daily = ss.groupby("d").agg(
            n=("session_id", "size"), att=("total_charge_attempts", "sum"),
            multi=("total_charge_attempts", lambda v: (v > 1).sum()),
            ffail=("first_attempt_success", lambda v: (~v.astype(bool)).sum()),
        ).reindex(rng_days, fill_value=0)
        t = tel[tel.port_id == p.port_id].set_index("date")[SIG].reindex(rng_days, fill_value=0)
        r7 = daily.rolling(7).sum()
        r30 = daily.rolling(30, min_periods=1).sum()
        f = pd.DataFrame({
            "sessions_7d": r7.n,
            "attempts_per_session_7d": r7.att / r7.n.replace(0, np.nan),
            "multi_attempt_share_7d": r7.multi / r7.n.replace(0, np.nan),
            "first_attempt_fail_share_7d": r7.ffail / r7.n.replace(0, np.nan),
            "sessions_30d": r30.n,
        })
        for c in SIG:
            t7 = t[c].rolling(7).sum()
            t28 = t[c].rolling(28).sum()
            f[c + "_7d"] = t7
            f[c + "_trend"] = t7 - t28 / 4
        f = f.loc[days]
        f["port_age_years"] = (days - p.install_date).days / 365.25
        fe = np.sort(fail[fail.port_id == p.port_id].start.values)
        k = np.searchsorted(fe, days.values, side="right")
        if len(fe):
            f["days_since_last_failure"] = np.where(
                k > 0, (days.values - fe[np.maximum(k - 1, 0)]) / np.timedelta64(1, "D"), np.nan)
            f["failures_365d"] = k - np.searchsorted(fe, (days - pd.Timedelta(days=365)).values, side="right")
            kk = np.searchsorted(fe, (days + pd.Timedelta(days=1)).values, side="left")
            nxt = fe[np.minimum(kk, len(fe) - 1)]
            f["y"] = ((kk < len(fe)) & (((nxt - days.values) / np.timedelta64(1, "D")) <= H)).astype(int)
        else:
            f["days_since_last_failure"] = np.nan
            f["failures_365d"] = 0
            f["y"] = 0
        f["date"] = days
        f["port_id"] = p.port_id
        out.append(f)
    return pd.concat(out)


FEATURE_LABELS = {
    "sessions_7d": "Sessions in last 7 days",
    "attempts_per_session_7d": "Charge attempts per session (7d)",
    "multi_attempt_share_7d": "Share of multi-attempt sessions (7d)",
    "first_attempt_fail_share_7d": "First-attempt failures (7d)",
    "sessions_30d": "Sessions in last 30 days",
    "port_age_years": "Port age",
    "days_since_last_failure": "Days since last failure",
    "failures_365d": "Failures in last 365 days",
}
for _c in SIG:
    _n = _c.replace("_", " ")
    FEATURE_LABELS[_c + "_7d"] = f"{_n.capitalize()} (7d)"
    FEATURE_LABELS[_c + "_trend"] = f"{_n.capitalize()} trend"


def fault_model(s, ev, pi, tel):
    F = fr02_features(s, ev, pi, tel)
    labelled = F[F.date <= END - pd.Timedelta(days=H)]
    feats = [c for c in F.columns if c not in ("y", "date", "port_id")]
    tr = labelled[labelled.date < "2021-01-01"]
    va = labelled[(labelled.date >= "2021-01-01") & (labelled.date < "2022-01-01")]
    te = labelled[labelled.date >= "2022-01-01"]
    m = lgb.LGBMClassifier(
        n_estimators=400, learning_rate=0.03, num_leaves=15, min_child_samples=50,
        class_weight="balanced", subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
        random_state=0, verbose=-1,
    ).fit(tr[feats], tr.y)
    pv = m.predict_proba(va[feats])[:, 1]
    cands = np.unique(np.quantile(pv, np.linspace(0, 1, 2001)))
    thr = max(t for t in cands if recall_score(va.y, pv >= t) >= 0.70)
    pt = m.predict_proba(te[feats])[:, 1]
    model = {
        "name": "FR-02 LightGBM",
        "horizonDays": H,
        "threshold": rnd(thr, 4),
        "trainedOn": "2018-2020",
        "thresholdSetOn": "2021 (70% recall)",
        "testedOn": "2022-2023",
        "test": {
            "rocAuc": rnd(roc_auc_score(te.y, pt), 3),
            "precision": rnd(precision_score(te.y, pt >= thr), 3),
            "recall": rnd(recall_score(te.y, pt >= thr), 3),
        },
    }
    now = F[F.date == END].set_index("port_id")
    prob = pd.Series(m.predict_proba(now[feats])[:, 1], index=now.index)
    contrib = pd.DataFrame(m.booster_.predict(now[feats], pred_contrib=True)[:, :-1],
                           index=now.index, columns=feats)
    return model, thr, now, prob, contrib


def main():
    X = pd.read_excel(SRC, sheet_name=[
        "stations_canonical", "ports_infra", "sessions_enriched", "maintenance_events",
        "failed_visits", "monthly_reliability", "telemetry_daily", "network_daily_peak"])
    st, pi, s = X["stations_canonical"], X["ports_infra"], X["sessions_enriched"]
    ev, mr, tel = X["maintenance_events"], X["monthly_reliability"], X["telemetry_daily"]
    nd = X["network_daily_peak"]
    prof = pd.read_csv(PROFILE, parse_dates=["interval_start"])

    # Map workbook station ids onto the dashboard's site ids (matched by display name).
    with open(SITES_JSON, encoding="utf-8") as f:
        by_name = {x["name"]: x["id"] for x in json.load(f)["sites"]}
    st["site_id"] = st.display_name.map(by_name)
    assert st.site_id.notna().all(), "station missing from boulder-data.json"
    sid = dict(zip(st.station_id, st.site_id))
    zip_of = dict(zip(st.station_id, st.zip.astype(int).astype(str)))

    pi["age"] = (END - pi.install_date).dt.days / 365.25
    pi["active"] = pi.last_session >= ACTIVE_SINCE

    # ---- ports -------------------------------------------------------------
    ports = [{
        "id": p.port_id, "siteId": sid[p.station_id],
        "installDate": day(p.install_date), "ageYears": rnd(p.age, 1),
        "ratedKw": rnd(p.evse_rated_kW, 2), "voltage": int(p.voltage_V), "breakerA": int(p.breaker_A),
        "sessions": int(p.sessions), "lastSession": day(p.last_session), "active": bool(p.active),
    } for p in pi.itertuples()]

    # ---- reliability (monthly, network) -------------------------------------
    fails = ev[ev.is_failure].copy()
    fails["month"] = fails.start.dt.strftime("%Y-%m")
    mttr = fails.groupby("month").repair_h.mean()
    g = mr.groupby("month").agg(
        ph=("port_hours", "sum"), down=("downtime_h", "sum"), failures=("failures", "sum"),
        events=("events", "sum"), fv=("failed_visits", "sum"), visits=("visits", "sum"),
        fas=("first_attempt_successes", "sum"))
    reliability = [{
        "month": mo, "uptimePct": rnd(100 * (1 - r.down / r.ph), 2),
        "mtbfH": rnd((r.ph - r.down) / r.failures, 0) if r.failures else None,
        "mttrH": rnd(mttr.get(mo), 1), "failures": int(r.failures), "events": int(r.events),
        "portHours": int(round(r.ph)), "downtimeH": rnd(r.down, 1),
        "failedVisits": int(r.fv), "visits": int(r.visits), "firstAttemptSuccesses": int(r.fas),
        "firstAttemptPct": rnd(100 * r.fas / r.visits, 1) if r.visits else None,
    } for mo, r in g.iterrows()]

    # ---- maintenance events -------------------------------------------------
    events = [{
        "id": e.event_id, "portId": e.port_id, "siteId": sid[e.station_id],
        "code": e.fault_code, "category": e.repair_category, "failure": bool(e.is_failure),
        "start": iso(e.start), "end": iso(e.end), "repairH": rnd(e.repair_h, 1),
        "costUsd": int(round(e.cost_usd)), "part": None if pd.isna(e.parts_replaced) else e.parts_replaced,
        "technician": bool(e.technician_dispatched),
    } for e in ev.sort_values("start").itertuples()]

    # ---- fault risk (FR-02) -------------------------------------------------
    model, thr, now, prob, contrib = fault_model(s, ev, pi, tel)
    risk = []
    for port_id, pr in prob.sort_values(ascending=False).items():
        p = pi[pi.port_id == port_id].iloc[0]
        if not p.active:                        # retired ports are not monitored
            continue
        row = now.loc[port_id]
        c = contrib.loc[port_id].sort_values(ascending=False)
        risk.append({
            "portId": port_id, "siteId": sid[p.station_id], "probability": rnd(pr, 4),
            "alert": bool(pr >= thr),
            "failures365d": int(row.failures_365d),
            "daysSinceLastFailure": None if pd.isna(row.days_since_last_failure) else int(row.days_since_last_failure),
            "telemetry7d": {k: int(row[k + "_7d"]) for k in SIG},
            "topFactors": [FEATURE_LABELS[k] for k, v in c.items() if v > 0][:2],
        })

    # ---- sustainability (real) ----------------------------------------------
    s["year"] = s.start.dt.year
    yearly = [{
        "year": int(y), "sessions": int(len(gy)), "energyKwh": int(round(gy.energy_kWh.sum())),
        "co2Kg": int(round(gy.ghg_savings_kg.sum())), "gasolineGal": int(round(gy.gasoline_savings_gal.sum())),
    } for y, gy in s.groupby("year")]
    use = s.groupby("site_use").agg(sessions=("session_id", "size"), energy=("energy_kWh", "sum"))
    sustainability = {
        "yearly": yearly,
        "byUse": {u: {"sessions": int(r.sessions), "energyKwh": int(round(r.energy))} for u, r in use.iterrows()},
        "ageingYears": AGEING_YEARS,
    }

    # ---- infrastructure planning ---------------------------------------------
    def window(df, col, lo_hi):
        lo, hi = lo_hi
        return df[(df[col] >= lo) & (df[col] < hi)]

    mr["mstart"] = pd.to_datetime(mr.month + "-01")
    s12, sprev = window(s, "start", LAST_12M), window(s, "start", PREV_12M)
    mr12 = window(mr, "mstart", LAST_12M)
    prof12 = window(prof, "interval_start", LAST_12M).copy()
    prof12["zip"] = prof12.station_id.map(zip_of)
    act = pi[pi.active]

    def area_metrics(key, keys_of_station):
        st_k = st.assign(k=keys_of_station)
        res = []
        for k, stg in st_k.groupby("k"):
            ids = set(stg.station_id)
            ports_k = act[act.station_id.isin(ids)]
            if ports_k.empty:
                continue
            m12 = mr12[mr12.station_id.isin(ids)]
            dwell = s12[s12.station_id.isin(ids)].dwell_h.sum()
            n12 = int(s12.station_id.isin(ids).sum())
            nprev = int(sprev.station_id.isin(ids).sum())
            if key == "zip":
                load = prof12[prof12.zip == k].groupby("interval_start").load_kW.sum()
            else:
                load = prof12[prof12.station_id.isin(ids)].groupby("interval_start").load_kW.sum()
            kw = ports_k.evse_rated_kW.sum()
            res.append({
                key: k, "ports": int(len(ports_k)), "installedKw": rnd(kw, 1),
                "sessions12m": n12, "sessionsPrev12m": nprev,
                "growthPct": rnd(100 * (n12 - nprev) / nprev, 1) if nprev >= MIN_PREV_SESSIONS else None,
                "occupancyPct": rnd(100 * dwell / m12.port_hours.sum(), 1) if m12.port_hours.sum() else 0,
                "peakKw": rnd(load.max() if len(load) else 0, 1),
                "peakLoadPct": rnd(100 * (load.max() if len(load) else 0) / kw, 1),
                "uptimePct": rnd(100 * (1 - m12.downtime_h.sum() / m12.port_hours.sum()), 2) if m12.port_hours.sum() else None,
            })
        return pd.DataFrame(res)

    def score(df):
        crit = pd.DataFrame({
            "occupancy": minmax(df.occupancyPct),
            "growth": minmax(df.growthPct.fillna(0).clip(-100, 100 * MAX_GROWTH)),
            "peakLoad": minmax(df.peakLoadPct),
            "downtime": minmax(100 - df.uptimePct.fillna(100)),
        })
        contrib = crit.mul(pd.Series(MCDA_WEIGHTS))
        df["score"] = (100 * contrib.sum(axis=1)).round(1)
        df["criteria"] = [{k: rnd(100 * v, 1) for k, v in r.items()} for _, r in contrib.iterrows()]
        return df.sort_values("score", ascending=False)

    zips = score(area_metrics("zip", st.zip.astype(int).astype(str)))
    growth = (zips.growthPct.fillna(0) / 100).clip(0, MAX_GROWTH)
    # Ports needed to bring next year's plugged-in hours down to the target occupancy.
    need = np.ceil(zips.occupancyPct / 100 * zips.ports * (1 + growth) / TARGET_OCCUPANCY)
    zips["addPorts"] = (need - zips.ports).clip(lower=0).astype(int)
    stations = score(area_metrics("siteId", st.site_id))
    stations["zip"] = stations.siteId.map(dict(zip(st.site_id, st.zip.astype(int).astype(str))))

    # Monthly network energy + a 6-month seasonal-naive forecast scaled by the
    # last-12-month vs previous-12-month growth.
    s["month"] = s.start.dt.to_period("M")
    monthly = s.groupby("month").energy_kWh.sum()
    yoy = window(s, "start", LAST_12M).energy_kWh.sum() / window(s, "start", PREV_12M).energy_kWh.sum()
    hist = [{"month": str(mo), "energyKwh": int(round(v))} for mo, v in monthly.items()]
    fc = [{"month": str(mo), "energyKwh": int(round(monthly[mo - 12] * yoy))}
          for mo in pd.period_range("2023-12", periods=6, freq="M")]
    zmonthly = s.assign(zip=s.station_id.map(zip_of)).groupby(["zip", "month"]).energy_kWh.sum()
    zfc = []
    for z in zips["zip"]:
        zm = zmonthly.loc[z]
        last = zm[(zm.index >= pd.Period("2022-12")) & (zm.index <= pd.Period("2023-11"))].sum()
        prev = zm[(zm.index >= pd.Period("2021-12")) & (zm.index <= pd.Period("2022-11"))].sum()
        g = last / prev if prev else 1
        nxt = sum(zm.get(mo - 12, 0) * g for mo in pd.period_range("2023-12", periods=6, freq="M"))
        same = sum(zm.get(mo - 12, 0) for mo in pd.period_range("2023-12", periods=6, freq="M"))
        zfc.append({"zip": z, "next6mKwh": int(round(nxt)), "sameMonthsLastYearKwh": int(round(same)),
                    "growthPct": rnd(100 * (g - 1), 1)})

    nd12 = window(nd, "date", LAST_12M)
    infrastructure = {
        "window": {"from": "2022-12-01", "to": "2023-11-30"},
        "weights": MCDA_WEIGHTS,
        "targetOccupancyPct": int(TARGET_OCCUPANCY * 100),
        "zips": json.loads(zips.to_json(orient="records")),
        "stations": json.loads(stations.to_json(orient="records")),
        "forecast": {"history": hist, "forecast": fc, "growthPct": rnd(100 * (yoy - 1), 1), "byZip": zfc},
        "networkPeak": {
            "peakKw12m": rnd(nd12.peak_load_kW.max(), 1),
            "meanDailyPeakKw12m": rnd(nd12.peak_load_kW.mean(), 1),
            "installedKw": rnd(act.evse_rated_kW.sum(), 1),
        },
    }

    out = {
        "meta": {
            "source": "PowerTech_synthetic_dataset.xlsx (seed 20261005)",
            "dateEnd": "2023-11-30",
            "synthetic": ["ports", "reliability", "events", "risk"],
            "note": "Sessions, energy and emissions are real City of Boulder data; port ratings, "
                    "install dates, maintenance events, telemetry and failed visits are synthetic.",
        },
        "ports": ports,
        "reliability": reliability,
        "events": events,
        "risk": {"model": model, "ports": risk},
        "sustainability": sustainability,
        "infrastructure": infrastructure,
    }

    # ---- checks ---------------------------------------------------------------
    assert len(ports) == len(pi) == 86
    assert len(events) == len(ev)
    assert len(risk) == int(pi.active.sum())
    assert sum(y["sessions"] for y in yearly) == len(s)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(model, indent=1))
    print(f"ports {len(ports)}, events {len(events)}, months {len(reliability)}, "
          f"alerts {sum(r['alert'] for r in risk)}, zips {len(zips)}, stations {len(stations)}")


if __name__ == "__main__":
    main()
