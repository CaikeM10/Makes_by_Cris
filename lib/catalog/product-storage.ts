import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProductImagePath, PRODUCT_IMAGE_BUCKET } from "./product-image";

export interface ProductStorage {
  upload(path: string, file: File): Promise<void>;
  remove(path: string): Promise<void>;
}

export function createProductStorage(client: SupabaseClient): ProductStorage {
  return {
    async upload(path, file) {
      if (!isProductImagePath(path)) throw new Error("invalid-image-path");
      const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("image-upload");
    },
    async remove(path) {
      if (!isProductImagePath(path)) throw new Error("unmanaged-image");
      const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
      if (error) throw new Error("image-cleanup");
    },
  };
}
