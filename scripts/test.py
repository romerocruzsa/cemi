#!/usr/bin/env python3
import os
import time
from pathlib import Path
from typing import Tuple

from cemi.writer import create_writer_from_env


def _get_output_root() -> Path:
    root = os.environ.get("CEMI_OUTPUT_DIR", "outputs")
    return Path(root).expanduser()


def evaluate(num_batches: int = 20) -> Tuple[float, float]:
    project_id = os.environ.get("CEMI_PROJECT_ID", "local-project")
    run_id = os.environ.get("CEMI_RUN_ID")

    writer = create_writer_from_env()

    writer.start_run(
        id=run_id,
        project_id=project_id,
        name="Eval run",
        method="evaluation",
    )

    writer.log_parameter(key="eval_batches", value=num_batches)

    val_loss = 0.5
    val_accuracy = 0.6

    for step in range(1, num_batches + 1):
        val_loss *= 0.99
        val_accuracy = min(0.99, val_accuracy + 0.003)

        writer.log_metric(name="val_loss", value=val_loss, step=step, unit="scalar")
        writer.log_metric(name="val_accuracy", value=val_accuracy, step=step, unit="fraction")

        if step % 10 == 0:
            writer.log_summary_metrics(
                {"val_last_loss": val_loss, "val_last_accuracy": val_accuracy}
            )
            writer.emit_run_record()

        time.sleep(0.05)

    writer.log_summary_metrics(
        {"val_final_loss": val_loss, "val_final_accuracy": val_accuracy}
    )

    # Persist a tiny evaluation report artifact under the output root.
    output_root = _get_output_root()
    report_dir = output_root / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "eval-summary.txt"
    try:
        with report_path.open("w", encoding="utf-8") as f:
            f.write(f"eval summary: val_loss={val_loss:.4f}, val_accuracy={val_accuracy:.4f}\n")
        writer.add_artifact(
            kind="report",
            name="demo-eval-report",
            uri=str(report_path),
            media_type="text/plain",
        )
    except OSError:
        pass

    writer.end_run(status="succeeded")
    writer.emit_run_record()

    return val_loss, val_accuracy


if __name__ == "__main__":
    val_loss, val_acc = evaluate()
    print(f"Eval done. val_loss={val_loss:.4f}, val_accuracy={val_acc:.4f}")
