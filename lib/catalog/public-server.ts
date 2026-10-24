import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { readPublicCatalog } from "./public-repository";
import { selectPublicCatalog } from "./public-catalog";

// React.cache deduplicates layout/page/metadata within a render only.
// The public layout uses force-dynamic: no persistent snapshot or static fallback.
export const getPublicCatalog = cache(async () => selectPublicCatalog(await readPublicCatalog(await createClient())));
