// Biblioteca pública compartida (Supabase).
//
// Metadata liviana en la tabla `public_books`; el contenido pesado
// (words/sections/…) vive como JSON en el bucket 'public-books' y se descarga
// solo cuando el usuario importa el libro a su dispositivo. Una vez importado,
// se guarda en IndexedDB y el lector funciona igual que con un PDF propio.

import { getSupabase } from "@/lib/supabase";
import { saveBook } from "@/lib/storage";
import type { BookMeta, BookSection } from "@/types";

const BUCKET = "public-books";

/** Fila del catálogo público (metadata). */
export interface PublicBook {
  id: string;
  title: string;
  author: string | null;
  totalWords: number;
  totalPages: number;
  wordsPerPage: number;
  summary: string | null;
  cover: string | null;
  contentPath: string;
  createdAt: string;
}

/** Contenido serializado que guardamos en Storage. */
interface PublicBookContent {
  words: string[];
  paraStarts?: number[];
  sections?: BookSection[];
  pdfPageStarts?: number[];
}

interface PublicBookRow {
  id: string;
  title: string;
  author: string | null;
  total_words: number;
  total_pages: number;
  words_per_page: number;
  summary: string | null;
  cover: string | null;
  content_path: string;
  created_at: string;
}

function rowToBook(r: PublicBookRow): PublicBook {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    totalWords: r.total_words,
    totalPages: r.total_pages,
    wordsPerPage: Number(r.words_per_page),
    summary: r.summary,
    cover: r.cover,
    contentPath: r.content_path,
    createdAt: r.created_at,
  };
}

/** Catálogo completo, más recientes primero. */
export async function listPublicBooks(): Promise<PublicBook[]> {
  const { data, error } = await getSupabase()
    .from("public_books")
    .select(
      "id,title,author,total_words,total_pages,words_per_page,summary,cover,content_path,created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PublicBookRow[]).map(rowToBook);
}

/** Descarga el JSON de contenido de un libro público desde Storage. */
async function downloadContent(path: string): Promise<PublicBookContent> {
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .download(path);
  if (error || !data) throw new Error(error?.message ?? "No se pudo descargar");
  return JSON.parse(await data.text()) as PublicBookContent;
}

/**
 * Importa un libro público al dispositivo: descarga el contenido y lo guarda en
 * IndexedDB como un libro más. Devuelve el id local para abrir el lector.
 */
export async function importToDevice(book: PublicBook): Promise<string> {
  const content = await downloadContent(book.contentPath);
  // Prefijo estable → reimportar no duplica y conserva el progreso local.
  const localId = `pub_${book.id}`;
  const now = Date.now();
  const meta: BookMeta = {
    id: localId,
    title: book.title,
    author: book.author ?? undefined,
    totalWords: book.totalWords,
    totalPages: book.totalPages,
    progressIndex: 0,
    timeReadMs: 0,
    createdAt: now,
    updatedAt: now,
    finished: false,
    wordsPerPage: book.wordsPerPage,
    summary: book.summary ?? undefined,
    cover: book.cover ?? undefined,
  };
  await saveBook(
    meta,
    content.words,
    content.paraStarts,
    content.sections,
    content.pdfPageStarts
  );
  return localId;
}

/**
 * Sube un libro al catálogo público (solo admin, forzado por RLS). Guarda el
 * contenido en Storage y la metadata en la tabla.
 */
export async function uploadPublicBook(input: {
  title: string;
  author?: string;
  totalWords: number;
  totalPages: number;
  wordsPerPage: number;
  summary?: string;
  cover?: string;
  content: PublicBookContent;
}): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debés iniciar sesión.");

  const path = `${crypto.randomUUID()}.json`;
  const blob = new Blob([JSON.stringify(input.content)], {
    type: "application/json",
  });

  const up = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "application/json",
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);

  const ins = await supabase.from("public_books").insert({
    title: input.title,
    author: input.author ?? null,
    total_words: input.totalWords,
    total_pages: input.totalPages,
    words_per_page: input.wordsPerPage,
    summary: input.summary ?? null,
    cover: input.cover ?? null,
    content_path: path,
    created_by: user.id,
  });
  if (ins.error) {
    // Rollback del archivo si la fila falla (p. ej. no sos admin).
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(ins.error.message);
  }
}

/** Elimina un libro del catálogo (fila + archivo). Solo admin. */
export async function deletePublicBook(book: PublicBook): Promise<void> {
  const supabase = getSupabase();
  const del = await supabase.from("public_books").delete().eq("id", book.id);
  if (del.error) throw new Error(del.error.message);
  await supabase.storage.from(BUCKET).remove([book.contentPath]);
}
