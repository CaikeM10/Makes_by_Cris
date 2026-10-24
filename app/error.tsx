"use client";
export default function StoreError({ reset }: { reset: () => void }) {
  return <main className="container-boutique py-16" role="alert"><h1 className="font-serif text-3xl">Não foi possível carregar esta página</h1><p className="my-4">Tente novamente em instantes.</p><button className="rounded-full border px-5 py-3" onClick={reset}>Tentar novamente</button></main>;
}
