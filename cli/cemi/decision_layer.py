from __future__ import annotations

import math
from typing import Any, Mapping


def _num(x: Any) -> float | None:
    if isinstance(x, (int, float)) and not isinstance(x, bool):
        return float(x)
    return None


def _matches_tags(have: Mapping[str, Any] | None, want: Mapping[str, Any] | None) -> bool:
    if not want:
        return True
    if not have:
        return False
    for k, v in want.items():
        if have.get(k) != v:
            return False
    return True


def _get_context_scenario(run: Mapping[str, Any]) -> str | None:
    ctx = run.get("context")
    if isinstance(ctx, dict):
        s = ctx.get("scenario")
        if isinstance(s, str) and s.strip():
            return s
    # fallback: run tags
    tags = run.get("tags")
    if isinstance(tags, dict):
        s = tags.get("scenario")
        if isinstance(s, str) and s.strip():
            return s
    return None


def summary_metric_value(
    run: Mapping[str, Any],
    *,
    name: str,
    scenario: str | None = None,
) -> float | None:
    """
    Resolve a metric value by name from the model-neutral RunRecord:
      run.metrics.summary: MetricEvent[]

    If scenario is provided, we accept either:
      - metric.tags.scenario == scenario, OR
      - run.context.scenario == scenario (metric without tags)
    """
    metrics = run.get("metrics")
    if not isinstance(metrics, dict):
        return None
    summary = metrics.get("summary")
    if not isinstance(summary, list):
        return None

    run_scenario = _get_context_scenario(run)
    for m in summary:
        if not isinstance(m, dict):
            continue
        if m.get("name") != name:
            continue
        v = _num(m.get("value"))
        if v is None:
            continue
        if scenario:
            tags = m.get("tags") if isinstance(m.get("tags"), dict) else None
            if tags and isinstance(tags.get("scenario"), str):
                if tags.get("scenario") != scenario:
                    continue
            else:
                if run_scenario != scenario:
                    continue
        return v
    return None


def _compare(op: str, value: float, threshold: float) -> bool:
    o = (op or "").strip()
    if o == "<=":
        return value <= threshold
    if o == ">=":
        return value >= threshold
    raise ValueError(f"Unsupported operator '{op}'. Only <= and >= are supported.")


def derive_cost_per_output_usd(
    run: Mapping[str, Any],
    *,
    throughput_metric: str,
    price_per_hour_metric: str,
    scenario: str | None = None,
) -> float | None:
    """
    plan.md v0 formula:
      cost_per_output_usd = (price_per_hour_usd / 3600) / throughput_outputs_per_s
    """
    thr = summary_metric_value(run, name=throughput_metric, scenario=scenario)
    pph = summary_metric_value(run, name=price_per_hour_metric, scenario=scenario)
    if thr is None or pph is None:
        return None
    if thr <= 0:
        return None
    return (pph / 3600.0) / thr


def evaluate_contract_v0(
    *,
    contract: Mapping[str, Any],
    runs: list[Mapping[str, Any]],
) -> dict[str, Any]:
    """
    Implements plan.md section 4.3 + 4.4 semantics.

    Returns:
      {
        "contract_id": ...,
        "project": ...,
        "recommended_run_id": ... | null,
        "evaluations": [
          { "run_id": ..., "passed": bool, "cost_per_output_usd": float|null,
            "failed_constraints": [..], "evidence": [..] }
        ],
        "recommendation": RecommendationResult
      }
    """
    contract_id = contract.get("contract_id") if isinstance(contract.get("contract_id"), str) else "contract"
    project = contract.get("project") if isinstance(contract.get("project"), str) else "default"

    quality = contract.get("quality")
    performance = contract.get("performance") if isinstance(contract.get("performance"), list) else []
    resources = contract.get("resources") if isinstance(contract.get("resources"), list) else []
    cost = contract.get("cost") if isinstance(contract.get("cost"), dict) else {}

    evals: list[dict[str, Any]] = []

    for run in runs:
        run_id = run.get("run_id") if isinstance(run.get("run_id"), str) else run.get("id")
        if not isinstance(run_id, str):
            continue

        evidence: list[dict[str, Any]] = []
        failed: list[str] = []
        passed = True

        # Quality gate (single)
        if isinstance(quality, dict):
            metric = quality.get("metric")
            op = quality.get("operator")
            thr = _num(quality.get("threshold"))
            direction = quality.get("direction")
            val = summary_metric_value(run, name=str(metric) if metric is not None else "")
            ok = False
            if val is not None and thr is not None:
                ok = _compare(str(op), val, thr)
            if not ok:
                passed = False
                failed.append("quality")
            evidence.append(
                {
                    "metric": str(metric) if metric is not None else "",
                    "value": val,
                    "threshold": thr,
                    "operator": op,
                    "direction": direction,
                    "passed": ok,
                }
            )

        # Performance constraints
        for c in performance:
            if not isinstance(c, dict):
                continue
            scenario = c.get("scenario") if isinstance(c.get("scenario"), str) else None
            metric = c.get("metric")
            op = c.get("operator")
            thr = _num(c.get("threshold"))
            val = summary_metric_value(run, name=str(metric) if metric is not None else "", scenario=scenario)
            ok = False
            if val is not None and thr is not None:
                ok = _compare(str(op), val, thr)
            if not ok:
                passed = False
                failed.append("performance")
            evidence.append(
                {
                    "metric": str(metric) if metric is not None else "",
                    "value": val,
                    "threshold": thr,
                    "operator": op,
                    "scenario": scenario,
                    "passed": ok,
                }
            )

        # Resource caps
        for c in resources:
            if not isinstance(c, dict):
                continue
            metric = c.get("metric")
            op = c.get("operator")
            thr = _num(c.get("threshold"))
            val = summary_metric_value(run, name=str(metric) if metric is not None else "")
            ok = False
            if val is not None and thr is not None:
                ok = _compare(str(op), val, thr)
            if not ok:
                passed = False
                failed.append("resources")
            evidence.append(
                {
                    "metric": str(metric) if metric is not None else "",
                    "value": val,
                    "threshold": thr,
                    "operator": op,
                    "passed": ok,
                }
            )

        # Cost model (derived)
        derive = bool(cost.get("derive_cost_per_output")) if isinstance(cost, dict) else False
        cost_per_output = None
        if derive and isinstance(cost, dict):
            throughput_metric = cost.get("throughput_metric")
            price_metric = cost.get("price_per_hour_metric")
            scenario = None
            # If exactly one performance constraint has a scenario, use that for cost derivation.
            scenarios = [
                c.get("scenario")
                for c in performance
                if isinstance(c, dict) and isinstance(c.get("scenario"), str) and c.get("scenario")
            ]
            if len(set(scenarios)) == 1:
                scenario = scenarios[0]
            if isinstance(throughput_metric, str) and isinstance(price_metric, str):
                cost_per_output = derive_cost_per_output_usd(
                    run,
                    throughput_metric=throughput_metric,
                    price_per_hour_metric=price_metric,
                    scenario=scenario,
                )
            evidence.append(
                {
                    "metric": "cost_per_output_usd",
                    "value": cost_per_output,
                    "passed": cost_per_output is not None and math.isfinite(cost_per_output),
                }
            )

        evals.append(
            {
                "run_id": run_id,
                "passed": passed,
                "failed_constraints": sorted(set(failed)),
                "evidence": evidence,
                "cost_per_output_usd": cost_per_output,
            }
        )

    # Recommendation: cheapest among passing
    passing = [e for e in evals if e["passed"] is True and isinstance(e.get("cost_per_output_usd"), (int, float))]
    passing.sort(key=lambda e: float(e["cost_per_output_usd"]))
    recommended_run_id = passing[0]["run_id"] if passing else None

    rec_evidence: list[dict[str, Any]] = []
    rec_failed: list[str] = []
    rec_passed = False
    if recommended_run_id:
        chosen = next((e for e in evals if e["run_id"] == recommended_run_id), None)
        if chosen:
            rec_passed = bool(chosen["passed"])
            rec_failed = list(chosen.get("failed_constraints") or [])
            rec_evidence = list(chosen.get("evidence") or [])

    return {
        "contract_id": contract_id,
        "project": project,
        "recommended_run_id": recommended_run_id,
        "evaluations": evals,
        "recommendation": {
            "contract_id": contract_id,
            "project": project,
            "recommended_run_id": recommended_run_id,
            "reason": {
                "passed": rec_passed,
                "failed_constraints": rec_failed,
                "evidence": rec_evidence,
            },
        },
    }


def build_metric_registry(*, runs: list[Mapping[str, Any]]) -> dict[str, Any]:
    """
    Minimal registry for UI autocomplete:
      - metric names seen in metrics.summary (with role/unit/aggregation/direction)
      - metric names seen in metrics.events
    """
    summary: dict[str, dict[str, Any]] = {}
    events: set[str] = set()

    for run in runs:
        metrics = run.get("metrics")
        if not isinstance(metrics, dict):
            continue
        s = metrics.get("summary")
        if isinstance(s, list):
            for m in s:
                if not isinstance(m, dict):
                    continue
                name = m.get("name")
                if not isinstance(name, str) or not name:
                    continue
                info = summary.setdefault(name, {"name": name, "roles": set(), "units": set(), "aggregations": set(), "directions": set()})
                role = m.get("role")
                unit = m.get("unit")
                agg = m.get("aggregation")
                direction = m.get("direction")
                if isinstance(role, str):
                    info["roles"].add(role)
                if isinstance(unit, str):
                    info["units"].add(unit)
                if isinstance(agg, str):
                    info["aggregations"].add(agg)
                if isinstance(direction, str):
                    info["directions"].add(direction)

        e = metrics.get("events")
        if isinstance(e, list):
            for m in e:
                if not isinstance(m, dict):
                    continue
                name = m.get("name")
                if isinstance(name, str) and name:
                    events.add(name)

    return {
        "summary": [
            {
                "name": v["name"],
                "roles": sorted(v["roles"]),
                "units": sorted(v["units"]),
                "aggregations": sorted(v["aggregations"]),
                "directions": sorted(v["directions"]),
            }
            for v in sorted(summary.values(), key=lambda x: x["name"])
        ],
        "events": sorted(events),
    }

