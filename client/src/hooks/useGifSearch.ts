/**
 * useGifSearch
 *
 * Manages GIF keyboard state: trending, debounced search, load-more.
 * Talks to the server proxy at /api/media/gifs/* — API key never touches the client.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { KlipyGif, KlipyPage } from '../types/klipy';

const API = '/api/media/gifs';
const PER_PAGE = 24;
const DEBOUNCE_MS = 350;

export interface GifSearchState {
  gifs: KlipyGif[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

export interface UseGifSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  state: GifSearchState;
  loadMore: () => void;
  reset: () => void;
  gifAvailable: boolean;
}

const EMPTY: GifSearchState = {
  gifs: [],
  isLoading: false,
  hasMore: false,
  error: null,
};

export function useGifSearch(): UseGifSearchReturn {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<GifSearchState>({ ...EMPTY, isLoading: true });
  const [page, setPage] = useState(1);
  const [gifAvailable, setGifAvailable] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check if GIF service is enabled on the server
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/media/status', { signal: ac.signal })
      .then((r) => r.json())
      .then((d: { gifAvailable?: boolean }) => setGifAvailable(d.gifAvailable ?? false))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const fetchPage = useCallback(async (q: string, pageNum: number, append: boolean) => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const url = q.trim()
        ? `${API}/search?q=${encodeURIComponent(q.trim())}&page=${pageNum}&per_page=${PER_PAGE}`
        : `${API}/trending?page=${pageNum}&per_page=${PER_PAGE}`;

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: KlipyPage<KlipyGif> = await res.json();

      setState((prev) => ({
        gifs: append ? [...prev.gifs, ...data.data.data] : data.data.data,
        isLoading: false,
        hasMore: data.data.has_next,
        error: null,
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // expected on cancel
      setState((prev) => ({ ...prev, isLoading: false, error: 'Could not load GIFs' }));
    }
  }, []);

  // Cancel all in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounce query changes and reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPage(query, 1, false);
    }, query ? DEBOUNCE_MS : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchPage]);

  const loadMore = useCallback(() => {
    if (state.isLoading || !state.hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(query, next, true);
  }, [state.isLoading, state.hasMore, page, query, fetchPage]);

  const reset = useCallback(() => {
    setQuery('');
    setPage(1);
    setState({ ...EMPTY, isLoading: true });
  }, []);

  return { query, setQuery, state, loadMore, reset, gifAvailable };
}
