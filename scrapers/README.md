# Anime Haven Scraper Framework

This folder contains a lightweight Python scraper framework for extracting anime metadata and episode information and storing it in the existing Anime Haven SQLite database.

## How it works

- `scraper.py` fetches a page URL and passes HTML to a parser implementation.
- `site_parsers.py` defines parser classes for specific sources.
- `db_store.py` saves anime records and episode metadata into `data/database.sqlite`.

## Usage

```bash
python scrapers/scraper.py --url "https://example.com/anime/123" --category shonen
```

Add `--dry-run` to inspect parsed output without modifying the database:

```bash
python scrapers/scraper.py --url "https://example.com/anime/123" --category shonen --dry-run
```

## Extending to new sites

1. Add a parser to `scrapers/site_parsers.py`.
2. Register the parser in `get_parser()`.
3. Implement `parse_anime_page()` to return:
   - `title`
   - `author`
   - `description`
   - `photo_url`
   - `tags`
   - `video_url`
   - `category`
   - `episodes`: list of episode dicts

## Parser extension example

The parser registry in `scrapers/site_parsers.py` can be extended with real parsers for your target sites.

- Add a new parser class that inherits `BaseSiteParser`.
- Implement `source_name()` and `parse_anime_page()`.
- Register the parser inside `get_parser()`.
- Optionally detect a source automatically in `detect_source_from_url()`.

Example:

```python
class MyAnimeSiteParser(BaseSiteParser):
    def source_name(self):
        return "my-anime-site"

    def parse_anime_page(self, html, url):
        soup = self.html_to_soup(html)
        return {
            "title": self.get_text(soup, "h1.title"),
            "author": self.get_text(soup, ".author-name"),
            "description": self.get_text(soup, ".anime-description"),
            "photo_url": self.get_meta(soup, "property", "og:image"),
            "tags": self.extract_tags(soup, ".tag-item"),
            "category": "shonen",
            "video_url": self.get_meta(soup, "property", "og:video"),
            "episodes": self.extract_episodes(soup),
        }
```

## Notes

- This framework stores metadata and episode links, not full video files.
- Always respect the terms of service and copyright policies of sites you scrape.
- Optional dependencies for richer scraping support are listed in `scrapers/requirements.txt`.

Optional dependencies for richer scraping support are listed in `scrapers/requirements.txt`.
