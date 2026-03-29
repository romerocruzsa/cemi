#!/usr/bin/env python3
"""
Local-only demo: one run with params, metrics, and a local file artifact.

Run from repo root: python -m cemi.examples.test_writer
Then start the gateway (cemi gateway) and open the workspace (cemi view) to see the run.
"""
import argparse
import json
from pathlib import Path

from cemi.writer import create_writer


def main():
    parser = argparse.ArgumentParser(description="CEMI local demo: one run with artifact.")
    parser.add_argument("--project", default="default", help="Project name (default: default)")
    parser.add_argument("--log-dir", default=".cemi", help="Base directory for runs/artifacts (default: .cemi)")
    args = parser.parse_args()

    log_dir = Path(args.log_dir).expanduser()
    log_dir.mkdir(parents=True, exist_ok=True)

    writer = create_writer(project=args.project, log_dir=str(log_dir))

    writer.start_run(name="Demo run", tags={"source": "example"})
    writer.log_parameter(key="learning_rate", value=0.001)
    writer.log_parameter(key="batch_size", value=32)
    writer.log_parameter(key="epochs", value=3)

    for step in range(1, 4):
        writer.log_metric(name="loss", value=1.0 / step, step=step)
        writer.log_metric(name="accuracy", value=0.5 + (step * 0.1), step=step)

    writer.emit_run_record()

    demo_artifact = log_dir / "demo_config.json"
    demo_artifact.write_text(json.dumps({"demo": True, "steps": 3}, indent=2), encoding="utf-8")
    writer.add_local_file_artifact(path=demo_artifact, kind="model")

    writer.log_summary_metrics({"final_accuracy": 0.95, "final_loss": 0.033})
    writer.end_run(status="succeeded")
    writer.emit_run_record()

    print(f"Run written to {log_dir.resolve()}.")
    print("Start the gateway with 'cemi gateway' and open 'cemi view' to see it.")


if __name__ == "__main__":
    main()
