#!/usr/bin/env python3
import os
import time
from pathlib import Path
from typing import Tuple

from cemi.writer import create_writer_from_env


def _get_output_root() -> Path:
    """
    Root directory for user artifacts (models, checkpoints, etc.).

    - If CEMI_OUTPUT_DIR is set, use that.
    - Otherwise default to ./outputs.
    """
    root = os.environ.get("CEMI_OUTPUT_DIR", "outputs")
    return Path(root).expanduser()


def train(num_steps: int = 100) -> Tuple[float, float]:
    project_id = os.environ.get("CEMI_PROJECT_ID", "local-project")
    run_id = os.environ.get("CEMI_RUN_ID")

    writer = create_writer_from_env()

    writer.start_run(
        id=run_id,
        project_id=project_id,
        name="Train run",
        method="gradient_descent",
    )

    writer.log_parameter(key="learning_rate", value=3e-4)
    writer.log_parameter(key="batch_size", value=64)
    writer.log_parameter(key="epochs", value=1)

    loss = 1.0
    accuracy = 0.2

    for step in range(1, num_steps + 1):
        loss *= 0.98
        accuracy = min(0.99, accuracy + 0.002)

        writer.log_metric(name="loss", value=loss, step=step, unit="scalar")
        writer.log_metric(name="accuracy", value=accuracy, step=step, unit="fraction")

        if step % 20 == 0:
            writer.log_summary_metrics({"last_loss": loss, "last_accuracy": accuracy})
            writer.emit_run_record()

        time.sleep(0.05)

    writer.log_summary_metrics({"final_loss": loss, "final_accuracy": accuracy})

    # Persist a small, human-inspectable "checkpoint" artifact under the output
    # root so users can see how to colocate real artifacts with their runs.
    output_root = _get_output_root()
    ckpt_dir = output_root / "checkpoints"
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = ckpt_dir / "model-final.txt"
    try:
        with ckpt_path.open("w", encoding="utf-8") as f:
            f.write(f"demo checkpoint: final_loss={loss:.4f}, final_accuracy={accuracy:.4f}\n")
        writer.add_artifact(
            kind="model",
            name="demo-train-checkpoint",
            uri=str(ckpt_path),
            media_type="text/plain",
        )
    except OSError:
        # If the filesystem is not writable, we still want the run to succeed.
        pass

    writer.end_run(status="succeeded")
    writer.emit_run_record()

    return loss, accuracy


if __name__ == "__main__":
    final_loss, final_acc = train()
    print(f"Train done. final_loss={final_loss:.4f}, final_accuracy={final_acc:.4f}")
