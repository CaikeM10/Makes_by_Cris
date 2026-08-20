import Link from "next/link";
import { AddToBagButton } from "@/components/add-to-bag-button";
import { FavoriteButton } from "@/components/favorite-button";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <Link
          href={`/produto/${product.slug}`}
          className="block"
          tabIndex={-1}
          aria-hidden="true"
        >
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        <FavoriteButton
          productId={product.id}
          productName={product.name}
          className="absolute top-2.5 right-2.5"
        />

        {!product.available && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-background/95 px-3 py-1 text-[0.625rem] font-medium tracking-wide uppercase text-muted-foreground">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3.5">
        <p className="eyebrow text-muted-foreground">{product.brand}</p>

        <h3 className="text-sm leading-snug font-medium text-pretty">
          <Link
            href={`/produto/${product.slug}`}
            className="hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>

        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {product.shortDescription}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-col">
            <span className="font-serif text-xl leading-none text-primary">
              {formatCurrency(product.price)}
            </span>

            <span className="mt-1 text-[0.625rem] leading-tight text-muted-foreground">
              à vista no PIX
            </span>

            <span className="mt-1 text-[0.625rem] leading-tight text-muted-foreground">
              {formatCurrency(product.creditPrice)} no cartão · até 6x
            </span>
          </div>

          <AddToBagButton product={product} variant="compact" />
        </div>
      </div>
    </article>
  );
}
