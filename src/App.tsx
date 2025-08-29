import React, { useEffect, useRef, useState } from "react";

interface Doc {
  key?: string;
  cover_edition_key?: string;
  edition_key?: string[];
  isbn?: string[];
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  edition_count?: number;
  subject?: string[];
  language?: string[];
  cover_i?: number;
}

interface Favorite {
  id: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

export default function BookFinderApp() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"title" | "author" | "isbn" | "q">("title");
  const [results, setResults] = useState<Doc[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<"relevance" | "year_asc" | "year_desc">(
    "relevance"
  );
  const [modalDoc, setModalDoc] = useState<any>(null);
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("bf_favs") || "[]");
    } catch {
      return [];
    }
  });

  const debounceRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem("bf_favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      setPage(1);
      setError("");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchResults(1, true);
    }, 450);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, sort]);

  async function fetchResults(targetPage = 1, replace = false) {
    setLoading(true);
    try {
      const param = encodeURIComponent(query.trim());
      let url = "https://openlibrary.org/search.json?";
      if (type === "title") url += `title=${param}`;
      else if (type === "author") url += `author=${param}`;
      else if (type === "isbn") url += `isbn=${param}`;
      else url += `q=${param}`;
      url += `&page=${targetPage}&limit=20`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      let docs: Doc[] = data.docs || [];
      if (sort !== "relevance") {
        docs = docs.slice().sort((a, b) => {
          const ay = a.first_publish_year || 0;
          const by = b.first_publish_year || 0;
          return sort === "year_asc" ? ay - by : by - ay;
        });
      }

      setResults((prev) => (replace ? docs : [...prev, ...docs]));
      setHasMore((data.start || 0) + docs.length < (data.numFound || 0));
      setError("");
    } catch (e) {
      console.error(e);
      setError("Failed to fetch results. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchResults(next, false);
  }

  function toggleFavorite(doc: Doc) {
    const id =
      doc.key ||
      doc.cover_edition_key ||
      doc.edition_key?.[0] ||
      doc.isbn?.[0] ||
      doc.title;
    if (!id) return;
    setFavorites((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (exists) return prev.filter((p) => p.id !== id);
      const newFav: Favorite = {
        id,
        title: doc.title,
        author_name: doc.author_name,
        cover_i: doc.cover_i,
      };
      return [newFav, ...prev];
    });
  }

  function isFav(doc: Doc) {
    const id =
      doc.key ||
      doc.cover_edition_key ||
      doc.edition_key?.[0] ||
      doc.isbn?.[0] ||
      doc.title;
    return favorites.some((f) => f.id === id);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>📚 Book Finder</h1>
      <input
        placeholder="Search by title, author, ISBN"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={() => fetchResults(1, true)}>Search</button>

      {error && <p>{error}</p>}
      {results.map((doc) => (
        <div key={doc.key || doc.title} style={{ margin: "10px 0" }}>
          <strong>{doc.title}</strong>{" "}
          {doc.author_name && <span>- {doc.author_name.join(", ")}</span>}
          <button onClick={() => toggleFavorite(doc)}>
            {isFav(doc) ? "★ Favorited" : "☆ Favorite"}
          </button>
        </div>
      ))}

      {loading && <p>Loading...</p>}
      {!loading && hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
