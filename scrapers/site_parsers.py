import re
from abc import ABC, abstractmethod
from urllib.parse import urlparse

from bs4 import BeautifulSoup


class BaseSiteParser(ABC):
    """Parser base class for a single streaming metadata source."""

    @abstractmethod
    def source_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def parse_anime_page(self, html: str, url: str) -> dict:
        """Return anime metadata and optional episode list."""

    def normalize_url(self, url: str) -> str:
        return url.strip()

    def html_to_soup(self, html: str) -> BeautifulSoup:
        return BeautifulSoup(html, "html.parser")

    def get_meta(self, soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        tag = soup.find("meta", attrs={attr_name: attr_value})
        return tag.get("content", None).strip() if tag and tag.has_attr("content") else None

    def get_text(self, soup: BeautifulSoup, selector: str) -> str | None:
        node = soup.select_one(selector)
        return node.get_text(strip=True) if node else None

    def extract_tags(self, soup: BeautifulSoup, selector: str = ".tag") -> str:
        tags = [tag.get_text(strip=True) for tag in soup.select(selector) if tag.get_text(strip=True)]
        return ", ".join(tags)

    def extract_episodes(self, soup: BeautifulSoup) -> list[dict]:
        episodes = []
        for block in soup.select("li.episode-item, div.episode, .episode-card"):
            title = self.get_text(block, "strong") or self.get_text(block, ".episode-title") or "Episode"
            description = self.get_text(block, "p")
            duration = self.get_text(block, ".duration")
            video_url = block.get("data-video") or block.get("href")
            number_text = self.get_text(block, ".episode-number")
            number = None
            if number_text:
                match = re.search(r"(\d+)", number_text)
                if match:
                    number = int(match.group(1))
            episodes.append({
                "episode_number": number,
                "title": title,
                "description": description,
                "duration": duration,
                "video_url": video_url,
            })
        return episodes


class GenericAnimeSiteParser(BaseSiteParser):
    """Generic parser for sites with common anime metadata patterns."""

    def source_name(self) -> str:
        return "generic-anime-site"

    def parse_anime_page(self, html: str, url: str) -> dict:
        soup = self.html_to_soup(html)
        title = self.get_text(soup, "h1") or self.get_meta(soup, "property", "og:title") or self.get_text(soup, "title")
        author = self.get_text(soup, ".author") or self.get_meta(soup, "name", "author")
        description = (
            self.get_meta(soup, "name", "description")
            or self.get_text(soup, ".description")
            or self.get_text(soup, "#description")
        )
        poster = self.get_meta(soup, "property", "og:image")
        tags = self.extract_tags(soup)
        category = self.get_meta(soup, "name", "category") or "shonen"
        video_url = self.get_meta(soup, "property", "og:video")
        if not video_url:
            video_url = self.get_text(soup, "video source[src]")

        return {
            "title": title or "Unknown Anime",
            "author": author or "Unknown",
            "description": description or "No description available.",
            "photo_url": poster,
            "tags": tags,
            "category": category,
            "video_url": video_url,
            "episodes": self.extract_episodes(soup),
        }


class MockAnimeSiteParser(BaseSiteParser):
    """Example parser for a simple mock site structure."""

    def source_name(self) -> str:
        return "mock-anime-site"

    def parse_anime_page(self, html: str, url: str) -> dict:
        soup = self.html_to_soup(html)
        title = self.get_text(soup, "h1") or "Unknown Anime"
        author = self.get_text(soup, ".author") or "Unknown"
        description = self.get_text(soup, ".description") or "No description available."
        poster = self.get_meta(soup, "property", "og:image")
        tags = self.extract_tags(soup)
        category = self.get_meta(soup, "name", "category") or "shonen"
        episodes = self.extract_episodes(soup)

        return {
            "title": title,
            "author": author,
            "description": description,
            "photo_url": poster,
            "tags": tags,
            "category": category,
            "video_url": None,
            "episodes": episodes,
        }


def get_parser(source_name: str) -> BaseSiteParser:
    mapping = {
        "mock": MockAnimeSiteParser(),
        "generic": GenericAnimeSiteParser(),
    }
    if source_name not in mapping:
        raise ValueError(f"No parser registered for source: {source_name}")
    return mapping[source_name]


def detect_source_from_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if "mocksite" in host:
        return "mock"
    return "generic"
