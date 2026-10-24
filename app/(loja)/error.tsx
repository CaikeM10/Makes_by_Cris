"use client";
export default function CatalogError({ reset }: { reset: () => void }) {
  return <div className="container-boutique py-16" role="alert"><h1 className="font-serif text-3xl">Catálogo temporariamente indisponível</h1><p className="my-4">Não foi possível carregar os produtos. Tente novamente em instantes.</p><button className="rounded-full border px-5 py-3" onClick={reset}>Tentar novamente</button></div>;
}
