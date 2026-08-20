"use client";

import { useState } from "react";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/store-provider";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type AddToBagButtonProps = {
  product: Product;
  quantity?: number;
  variation?: string;
  variant?: "compact" | "full";
  className?: string;
};

export function AddToBagButton({
  product,
  quantity = 1,
  variation,
  variant = "full",
  className,
}: AddToBagButtonProps) {
  const { addItem } = useStore();
  const [added, setAdded] = useState(false);

  const handleAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product.available) return;

    addItem(product, quantity, variation);
    setAdded(true);

    toast.success("Adicionado à sacola", {
      description: product.name,
    });

    setTimeout(() => setAdded(false), 990);
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={!product.available}
        aria-label={`Adicionar ${product.name} à sacola`}
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-primary-foreground transition-all duration-200 hover:brightness-95 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
          added ? "bg-[#6F8B72] scale-105" : "bg-primary hover:bg-primary/90",
          className,
        )}
      >
        {added ? (
          <Check
            className="size-4 animate-in zoom-in-75 duration-200"
            aria-hidden="true"
          />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={handleAdd}
      disabled={!product.available}
      className={cn(
        "h-13 gap-2 rounded-full text-sm tracking-wide transition-all",
        className,
      )}
    >
      {added ? (
        <>
          <Check className="size-4" aria-hidden="true" />
          Adicionado
        </>
      ) : (
        <>
          <ShoppingBag className="size-4" aria-hidden="true" />
          {product.available ? "Adicionar à sacola" : "Indisponível"}
        </>
      )}
    </Button>
  );
}
