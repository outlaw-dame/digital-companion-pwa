/**
 * Feed processor unit tests.
 * Tests the pure parsing and formatting functions — no network calls.
 * fetchAndParseFeed/discoverFeed/processFeedsFromText are network-dependent
 * and are not tested here (covered by integration testing).
 */

import { describe, test, expect } from "bun:test";
import {
  unescapeXml,
  cleanXmlText,
  tagContent,
  tagAttr,
  allTagSegments,
  detectFeedFormat,
  parseFeed,
  formatFeedsForPrompt,
} from "../engine/feedProcessor";

// ─── unescapeXml ──────────────────────────────────────────────────────────────

describe("unescapeXml", () => {
  test("decodes named entities", () => {
    expect(unescapeXml("a &amp; b")).toBe("a & b");
    expect(unescapeXml("&lt;tag&gt;")).toBe("<tag>");
    expect(unescapeXml("say &quot;hi&quot;")).toBe('say "hi"');
    expect(unescapeXml("it&apos;s")).toBe("it's");
  });

  test("decodes decimal numeric entities", () => {
    expect(unescapeXml("&#65;")).toBe("A");
    expect(unescapeXml("&#169;")).toBe("©");
  });

  test("decodes hex numeric entities", () => {
    expect(unescapeXml("&#x41;")).toBe("A");
    expect(unescapeXml("&#xA9;")).toBe("©");
  });

  test("passes through plain text unchanged", () => {
    expect(unescapeXml("hello world")).toBe("hello world");
  });

  test("decodes multiple entities in one string", () => {
    expect(unescapeXml("&lt;p&gt;hello &amp; world&lt;/p&gt;")).toBe("<p>hello & world</p>");
  });
});

// ─── cleanXmlText ─────────────────────────────────────────────────────────────

describe("cleanXmlText", () => {
  test("strips CDATA wrappers", () => {
    expect(cleanXmlText("<![CDATA[hello world]]>")).toBe("hello world");
  });

  test("strips HTML tags", () => {
    expect(cleanXmlText("<p>hello <strong>world</strong></p>")).toBe("hello world");
  });

  test("decodes entities after stripping", () => {
    expect(cleanXmlText("a &amp; b")).toBe("a & b");
  });

  test("collapses whitespace", () => {
    expect(cleanXmlText("  hello   \n  world  ")).toBe("hello world");
  });

  test("removes XML comments", () => {
    expect(cleanXmlText("before <!-- comment --> after")).toBe("before after");
  });

  test("strips ASCII control characters", () => {
    expect(cleanXmlText("hello\x00world\x01")).toBe("helloworld");
  });
});

// ─── tagContent ───────────────────────────────────────────────────────────────

describe("tagContent", () => {
  test("extracts bare tag content", () => {
    expect(tagContent("<title>My Feed</title>", "title")).toBe("My Feed");
  });

  test("extracts namespaced tag content", () => {
    expect(tagContent("<dc:creator>Alice</dc:creator>", "creator")).toBe("Alice");
  });

  test("extracts tag with attributes", () => {
    expect(tagContent('<link rel="self" href="http://x.com"/>My link</link>', "link")).toBe("My link");
  });

  test("returns null when tag not present", () => {
    expect(tagContent("<title>Test</title>", "description")).toBeNull();
  });

  test("is case-insensitive for tag names", () => {
    expect(tagContent("<TITLE>Upper</TITLE>", "title")).toBe("Upper");
  });
});

// ─── tagAttr ──────────────────────────────────────────────────────────────────

describe("tagAttr", () => {
  test("extracts double-quoted attribute", () => {
    expect(tagAttr('<link href="https://example.com">', "href")).toBe("https://example.com");
  });

  test("extracts single-quoted attribute", () => {
    expect(tagAttr("<link href='https://example.com'>", "href")).toBe("https://example.com");
  });

  test("returns null when attribute not present", () => {
    expect(tagAttr('<link href="x">',  "rel")).toBeNull();
  });

  test("is case-insensitive for attribute names", () => {
    expect(tagAttr('<link HREF="https://example.com">', "href")).toBe("https://example.com");
  });
});

// ─── allTagSegments ───────────────────────────────────────────────────────────

describe("allTagSegments", () => {
  test("returns all matching segments", () => {
    const xml = "<item><title>A</title></item><item><title>B</title></item>";
    const segs = allTagSegments(xml, "item");
    expect(segs).toHaveLength(2);
  });

  test("returns empty array when tag not found", () => {
    expect(allTagSegments("<rss/>", "item")).toHaveLength(0);
  });

  test("handles namespaced tags", () => {
    const xml = "<atom:entry>one</atom:entry><atom:entry>two</atom:entry>";
    const segs = allTagSegments(xml, "entry");
    expect(segs).toHaveLength(2);
  });
});

// ─── detectFeedFormat ─────────────────────────────────────────────────────────

describe("detectFeedFormat", () => {
  test("detects RSS 2.0 by body root element", () => {
    const body = `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`;
    expect(detectFeedFormat(body, "text/xml")).toBe("rss");
  });

  test("detects Atom by body root element", () => {
    const body = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`;
    expect(detectFeedFormat(body, "text/xml")).toBe("atom");
  });

  test("detects JSON Feed by content-type + version field", () => {
    const body = JSON.stringify({ version: "https://jsonfeed.org/version/1.1", title: "T", items: [] });
    expect(detectFeedFormat(body, "application/feed+json")).toBe("json");
  });

  test("detects RDF/RSS 1.0 by body root element", () => {
    const body = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>`;
    expect(detectFeedFormat(body, "text/xml")).toBe("rdf");
  });

  test("returns null for plain HTML", () => {
    const body = "<!DOCTYPE html><html><head></head><body></body></html>";
    expect(detectFeedFormat(body, "text/html")).toBeNull();
  });

  test("returns null for non-feed XML", () => {
    const body = `<?xml version="1.0"?><config><key>value</key></config>`;
    expect(detectFeedFormat(body, "text/xml")).toBeNull();
  });
});

// ─── parseFeed (RSS) ──────────────────────────────────────────────────────────

const RSS_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    <item>
      <title>Item One</title>
      <link>https://example.com/1</link>
      <description>First item description</description>
      <pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate>
      <author>Alice</author>
    </item>
    <item>
      <title>Item Two</title>
      <link>https://example.com/2</link>
      <description><![CDATA[<p>Second item</p>]]></description>
      <pubDate>Thu, 02 Jan 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe("parseFeed (RSS 2.0)", () => {
  const feed = parseFeed(RSS_BODY, "rss", "https://example.com/feed.xml");

  test("parses feed title", () => {
    expect(feed.title).toBe("Test Feed");
  });

  test("parses feed site URL", () => {
    expect(feed.siteUrl).toBe("https://example.com");
  });

  test("parses feed description", () => {
    expect(feed.description).toContain("test RSS feed");
  });

  test("parses item titles", () => {
    expect(feed.items[0].title).toBe("Item One");
    expect(feed.items[1].title).toBe("Item Two");
  });

  test("parses item links", () => {
    expect(feed.items[0].link).toBe("https://example.com/1");
  });

  test("parses item description (strips CDATA/HTML)", () => {
    expect(feed.items[1].description).not.toContain("<p>");
    expect(feed.items[1].description).toContain("Second item");
  });

  test("parses item author", () => {
    expect(feed.items[0].author).toBe("Alice");
  });

  test("parses pubDate to ISO", () => {
    expect(feed.items[0].publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("sets format to 'rss'", () => {
    expect(feed.format).toBe("rss");
  });

  test("sets url to the provided URL", () => {
    expect(feed.url).toBe("https://example.com/feed.xml");
  });
});

// ─── parseFeed (Atom) ─────────────────────────────────────────────────────────

const ATOM_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <link href="https://atom.example.com"/>
  <subtitle>An atom subtitle</subtitle>
  <entry>
    <title>Atom Entry One</title>
    <link href="https://atom.example.com/1"/>
    <updated>2025-03-15T12:00:00Z</updated>
    <author><name>Bob</name></author>
    <summary>Summary text here</summary>
  </entry>
</feed>`;

describe("parseFeed (Atom 1.0)", () => {
  const feed = parseFeed(ATOM_BODY, "atom", "https://atom.example.com/feed");

  test("parses feed title", () => {
    expect(feed.title).toBe("Atom Feed");
  });

  test("parses entry title", () => {
    expect(feed.items[0].title).toBe("Atom Entry One");
  });

  test("parses entry link from href attribute", () => {
    expect(feed.items[0].link).toBe("https://atom.example.com/1");
  });

  test("parses entry updated date", () => {
    expect(feed.items[0].publishedAt).toMatch(/^2025-03-15T/);
  });

  test("parses entry author name", () => {
    expect(feed.items[0].author).toBe("Bob");
  });

  test("parses entry summary as description", () => {
    expect(feed.items[0].description).toContain("Summary text");
  });

  test("sets format to 'atom'", () => {
    expect(feed.format).toBe("atom");
  });
});

// ─── parseFeed (JSON Feed) ────────────────────────────────────────────────────

const JSON_BODY = JSON.stringify({
  version: "https://jsonfeed.org/version/1.1",
  title: "JSON Feed Title",
  home_page_url: "https://json.example.com",
  description: "A JSON Feed",
  items: [
    {
      id: "1",
      url: "https://json.example.com/1",
      title: "JSON Item One",
      content_text: "Plain text content",
      date_published: "2025-04-01T00:00:00Z",
      authors: [{ name: "Carol" }],
    },
    {
      id: "2",
      url: "https://json.example.com/2",
      title: "JSON Item Two",
      content_html: "<p>HTML content</p>",
    },
  ],
});

describe("parseFeed (JSON Feed)", () => {
  const feed = parseFeed(JSON_BODY, "json", "https://json.example.com/feed.json");

  test("parses feed title", () => {
    expect(feed.title).toBe("JSON Feed Title");
  });

  test("parses home_page_url as siteUrl", () => {
    expect(feed.siteUrl).toBe("https://json.example.com");
  });

  test("parses item title", () => {
    expect(feed.items[0].title).toBe("JSON Item One");
  });

  test("parses item URL", () => {
    expect(feed.items[0].link).toBe("https://json.example.com/1");
  });

  test("uses content_text as description", () => {
    expect(feed.items[0].description).toContain("Plain text content");
  });

  test("strips HTML from content_html", () => {
    expect(feed.items[1].description).not.toContain("<p>");
    expect(feed.items[1].description).toContain("HTML content");
  });

  test("parses authors array", () => {
    expect(feed.items[0].author).toBe("Carol");
  });

  test("parses date_published", () => {
    expect(feed.items[0].publishedAt).toMatch(/^2025-04-01T/);
  });

  test("sets format to 'json'", () => {
    expect(feed.format).toBe("json");
  });
});

// ─── parseFeed: item cap ──────────────────────────────────────────────────────

describe("parseFeed item cap", () => {
  test("caps items at 10", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      url: `https://x.com/${i}`,
      title: `Item ${i}`,
    }));
    const body = JSON.stringify({
      version: "https://jsonfeed.org/version/1.1",
      title: "Many Items",
      items,
    });
    const feed = parseFeed(body, "json", "https://x.com/feed");
    expect(feed.items.length).toBeLessThanOrEqual(10);
  });
});

// ─── formatFeedsForPrompt ─────────────────────────────────────────────────────

describe("formatFeedsForPrompt", () => {
  test("returns empty string for empty array", () => {
    expect(formatFeedsForPrompt([])).toBe("");
  });

  test("includes feed title and item titles", () => {
    const feed = parseFeed(RSS_BODY, "rss", "https://example.com/feed.xml");
    const output = formatFeedsForPrompt([feed]);
    expect(output).toContain("Test Feed");
    expect(output).toContain("Item One");
  });

  test("includes all feeds when multiple provided", () => {
    const feed = parseFeed(RSS_BODY, "rss", "https://example.com/feed.xml");
    const output = formatFeedsForPrompt([feed, feed]);
    // Both feeds appear — count occurrences of the title
    const count = (output.match(/Test Feed/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("includes FEED CONTENT header", () => {
    const feed = parseFeed(RSS_BODY, "rss", "https://example.com/feed.xml");
    const output = formatFeedsForPrompt([feed]);
    expect(output).toContain("FEED CONTENT");
  });
});
