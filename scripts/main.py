#!/usr/bin/env python3
"""
End-to-end example: train + eval, as a user would.

    cemi start -- python scripts/main.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure scripts/ is on path when run as python scripts/main.py
sys.path.insert(0, str(Path(__file__).resolve().parent))

from train import train
from test import evaluate


def main() -> None:
    project_id = os.environ.get("CEMI_PROJECT_ID", "local-project")
    run_id = os.environ.get("CEMI_RUN_ID", "main-pipeline")

    print(f"[CEMI] Project: {project_id}, Run: {run_id}")
    print("[CEMI] Starting training...")
    final_loss, final_acc = train()

    print("[CEMI] Training complete.")
    print("[CEMI] Starting evaluation...")
    val_loss, val_acc = evaluate()

    print("[CEMI] Evaluation complete.")
    print(
        f"[CEMI] Summary: "
        f"train_loss={final_loss:.4f}, train_acc={final_acc:.4f}, "
        f"val_loss={val_loss:.4f}, val_acc={val_acc:.4f}"
    )


if __name__ == "__main__":
    main()
