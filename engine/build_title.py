#!/usr/bin/env python3
"""Build an eBay-style title from Field: Value text. Title only."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "gwprice"))
from listing import ListingBuilder  # noqa: E402


class _NoEngine:
    pass


def main():
    text = sys.stdin.read()
    result = ListingBuilder(_NoEngine()).build(text, with_price=False)
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
