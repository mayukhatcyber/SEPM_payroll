const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

const CACHE_TTL_MS = 1000 * 60 * 60;
let cached = null;

const toMonthKey = (value) => value.toLowerCase();

const parseMonthYear = (filename) => {
  const shortMatch = filename.match(/am([a-z]{3})(\d{4})/i);
  if (shortMatch) {
    const month = MONTHS[toMonthKey(shortMatch[1])] || 0;
    const year = Number(shortMatch[2]);
    if (month && year) {
      const monthLabel = shortMatch[1][0].toUpperCase() + shortMatch[1].slice(1);
      return { month, year, label: `${monthLabel} ${year}` };
    }
  }
  const match = filename.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)[_\-]?(\d{4})/i
  );
  if (!match) return null;
  const month = MONTHS[toMonthKey(match[1])] || 0;
  const year = Number(match[2]);
  if (!month || !year) return null;
  return { month, year, label: `${match[1]} ${year}` };
};

const sortLatest = (a, b) => {
  if (!a.date) return 1;
  if (!b.date) return -1;
  if (a.date.year !== b.date.year) return b.date.year - a.date.year;
  return b.date.month - a.date.month;
};

const extractLatest = (html, pageUrl) => {
  const matches = [...html.matchAll(/href=["']([^"']+\.pdf)["']/gi)].map(
    (match) => match[1]
  );

  const resolvedLinks = matches.map((link) => {
    if (link.startsWith("http")) return link;
    return new URL(link, pageUrl).toString();
  });

  const monthlyNotes = resolvedLinks
    .filter(
      (link) =>
        /portal\.amfiindia\.com\/spages\//i.test(link) &&
        /\.pdf$/i.test(link)
    )
    .map((link) => {
      const filename = link.split("/").pop() || "";
      const date = parseMonthYear(filename);
      return { link, date };
    })
    .sort(sortLatest);

  return monthlyNotes[0] || null;
};

const fetchTrends = async () => {
  const pageUrl = "https://www.amfiindia.com/research-information/amfi-monthly";
  let latest = null;

  try {
    const response = await fetch(pageUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    latest = extractLatest(html, pageUrl);
  } catch (error) {
    console.error("AMFI fetch failed", error);
  }

  if (!latest) {
    try {
      const proxyUrl = `https://r.jina.ai/http://www.amfiindia.com/research-information/amfi-monthly`;
      const response = await fetch(proxyUrl, { cache: "no-store" });
      const html = await response.text();
      latest = extractLatest(html, pageUrl);
    } catch (error) {
      console.error("AMFI proxy fetch failed", error);
    }
  }

  const asOf = latest?.date?.label || "Latest";
  const highlights = latest
    ? [
        "Mutual fund industry flows are updated monthly by AMFI.",
        "SIP participation remains a key indicator of retail investor discipline.",
        "Passive and index products continue to see steady adoption."
      ]
    : [
        "Unable to fetch the latest AMFI note right now.",
        "Please try again later or check the AMFI Monthly Note page.",
        "Guidance below is based on long-term best practices."
      ];

  return {
    asOf,
    pdfUrl: latest?.link || null,
    highlights,
    fetchedAt: new Date().toISOString()
  };
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("refresh") === "1";

  if (!force && cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL_MS) {
      return Response.json(cached);
    }
  }

  try {
    cached = await fetchTrends();
    return Response.json(cached);
  } catch {
    return Response.json(
      {
        asOf: cached?.asOf || "Latest",
        pdfUrl: cached?.pdfUrl || null,
        highlights:
          cached?.highlights ||
          [
            "Unable to fetch the latest AMFI note right now.",
            "Please try again later or check the AMFI Monthly Note page.",
            "Guidance below is based on long-term best practices."
          ],
        fetchedAt: cached?.fetchedAt || null
      },
      { status: 502 }
    );
  }
}
