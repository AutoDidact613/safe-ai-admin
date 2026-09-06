import argparse
from datetime import datetime

from config import load_config
from graph import build_graph


def _parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d")


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Org/payments log agent - reports organization wallet activity anomalies."
    )
    parser.add_argument(
        "--start", type=_parse_date, default=None, help="Start date (YYYY-MM-DD), optional."
    )
    parser.add_argument(
        "--end", type=_parse_date, default=None, help="End date (YYYY-MM-DD), optional."
    )
    return parser.parse_args(argv)


def main(argv=None) -> None:
    args = parse_args(argv)
    graph = build_graph(load_config())
    result = graph.invoke({"start_date": args.start, "end_date": args.end})
    print(result["report"])


if __name__ == "__main__":
    main()
