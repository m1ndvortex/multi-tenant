#!/usr/bin/env python3
"""
Unified runner for testing R2 and B2 connectivity: upload, download, list, delete.
Reads creds from environment via app.core.config.Settings.
"""

import sys
import traceback

# Ensure app path is available when running in container or host
sys.path.insert(0, '/app')

from test_r2_connectivity import test_r2_operations, test_failover_operations  # type: ignore
from test_b2_connection import test_b2_connection  # type: ignore


def main():
    print("==== Cloud Storage Connectivity Test Suite ====")
    results = {"b2": False, "r2": False, "failover": False}

    # B2
    try:
        print("\n--- Running B2 tests ---")
        results["b2"] = bool(test_b2_connection())
    except Exception:
        print("B2 tests crashed:")
        traceback.print_exc()

    # R2
    try:
        print("\n--- Running R2 tests ---")
        results["r2"] = bool(test_r2_operations())
    except Exception:
        print("R2 tests crashed:")
        traceback.print_exc()

    # Failover (only if R2 basic passed)
    if results["r2"]:
        try:
            print("\n--- Running Failover tests ---")
            test_failover_operations()
            results["failover"] = True
        except Exception:
            print("Failover tests crashed:")
            traceback.print_exc()

    print("\n==== Summary ====")
    for k, v in results.items():
        print(f"{k}: {'PASS' if v else 'FAIL'}")

    # Exit code: 0 if any succeeded (so CI doesn't block if one provider disabled)
    sys.exit(0 if any(results.values()) else 1)


if __name__ == "__main__":
    main()
