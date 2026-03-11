from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import build_from_fixture_directory, refresh_data
from .settings import load_settings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pipeline de contratos menores do Concello de Vigo")
    subparsers = parser.add_subparsers(dest="command", required=True)

    refresh = subparsers.add_parser("refresh", help="Descarga datos y genera artefactos")
    refresh.add_argument("--all", action="store_true", help="Procesa todos los años disponibles")
    refresh.add_argument("--year", action="append", type=int, default=[], help="Año concreto a procesar. Se puede repetir.")
    refresh.add_argument("--force-download", action="store_true", help="Vuelve a descargar aunque exista cache raw")

    fixtures = subparsers.add_parser("build-fixtures", help="Genera artefactos a partir de fixtures locales")
    fixtures.add_argument("--fixture-dir", type=Path, default=Path("pipeline/tests/fixtures"), help="Directorio con archivos raw-YYYY.json")

    return parser.parse_args()



def main() -> int:
    args = parse_args()
    settings = load_settings()

    if args.command == "refresh":
        years = None if args.all or not args.year else sorted(set(args.year))
        refresh_data(years=years, force_download=args.force_download, settings=settings)
        return 0

    if args.command == "build-fixtures":
        build_from_fixture_directory(args.fixture_dir, settings=settings)
        return 0

    return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
