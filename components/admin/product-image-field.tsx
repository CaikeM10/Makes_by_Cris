"use client";
import { useEffect, useState } from "react";
import { resolveProductImage, validateProductImage } from "@/lib/catalog/product-image";

export function ProductImageField({ image, name, pending, error }: { image?: string; name?: string; pending: boolean; error?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [localError, setLocalError] = useState<string>();
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const message = localError || error;
  return <aside className="catalog-panel catalog-preview"><h2>Imagem principal</h2>
    <img src={preview || resolveProductImage(image || "/placeholder.svg")} alt={name || "Prévia do produto"} width={320} height={320} />
    <div className="admin-field"><label htmlFor="image">{image ? "Alterar foto" : "Escolher foto"}</label>
      <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!image} disabled={pending} aria-invalid={!!message} aria-describedby="image-help image-error" onChange={event => {
        const selected = event.target.files?.[0] ?? null;
        const invalid = validateProductImage(selected, !image);
        setLocalError(invalid);
        if (invalid) { event.target.value = ""; setFile(null); } else setFile(selected);
      }} />
      <p id="image-help" className="admin-help">JPEG, PNG ou WebP. Até 5 MiB. {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MiB` : ""}</p>
      <div id="image-error" aria-live="polite">{message && <p className="catalog-field-error">{message}</p>}</div>
    </div>
  </aside>;
}
