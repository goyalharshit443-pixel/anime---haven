import argparse
import json
import pathlib
import re
import urllib.request

from db_store import add_episodes, ensure_tables, log_source, upsert_anime
from site_parsers import detect_source_from_url, get_parser


def fetch_html(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/115.0 Safari/537.36"
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def normalize_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape anime metadata and episode information into Anime Haven's database."
    )
    parser.add_argument("--url", required=True, help="Page URL to scrape")
    parser.add_argument("--source", help="Parser source name (e.g. mock)")
    parser.add_argument("--category", required=True, choices=["shonen", "shojo", "seinen", "josei", "kodomomuke"], help="Anime category to store the data under")
    parser.add_argument("--dry-run", action="store_true", help="Show parsed results without writing to the database")
    parser.add_argument("--output-json", help="Write parsed metadata to a JSON file")
    args = parser.parse_args()

    source_name = args.source or detect_source_from_url(args.url)
    parser_impl = get_parser(source_name)
    print(f"Using parser: {parser_impl.source_name()}")

    html = fetch_html(args.url)
    scraped = parser_impl.parse_anime_page(html, args.url)
    scraped["category"] = args.category
    scraped["source_url"] = args.url

    if args.output_json:
        pathlib.Path(args.output_json).write_text(json.dumps(scraped, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote parsed metadata to {args.output_json}")

    if args.dry_run:
        print(json.dumps(scraped, indent=2, ensure_ascii=False))
        return

    ensure_tables()
    anime_id = upsert_anime(args.category, scraped)
    log_source(args.category, anime_id, parser_impl.source_name(), args.url)
    if scraped.get("episodes"):
        add_episodes(args.category, anime_id, scraped["episodes"])

    print(f"Stored {scraped.get('title')} into category {args.category} with anime_id={anime_id}")


if __name__ == "__main__":
    main()
