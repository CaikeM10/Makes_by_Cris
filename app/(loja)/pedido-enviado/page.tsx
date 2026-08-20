import type { Metadata } from "next";
import { Check } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { storeConfig } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Pedido enviado",
  description: "Seu pedido foi enviado para o WhatsApp da loja.",
};

export default function PedidoEnviadoPage() {
  return (
    <div className="container-boutique flex flex-col items-center gap-6 py-24 text-center lg:py-32">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
        <Check className="size-7" strokeWidth={1.75} aria-hidden="true" />
      </span>

      <div className="flex max-w-md flex-col gap-3">
        <h1 className="font-serif text-3xl leading-tight text-balance lg:text-4xl">
          Pedido enviado com sucesso
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Já recebemos seu resumo no WhatsApp {storeConfig.whatsappDisplay}. Em
          instantes uma atendente confirma o pagamento e combina a{" "}
          {"entrega ou retirada"} com você.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <LinkButton href="/" size="lg" className="h-12 rounded-full px-7">
          Voltar ao início
        </LinkButton>
        <LinkButton
          href="/categorias"
          variant="outline"
          size="lg"
          className="h-12 rounded-full border-foreground/15 px-7"
        >
          Continuar comprando
        </LinkButton>
      </div>

      <p className="text-xs text-muted-foreground">
        Atendimento {storeConfig.hours} · {storeConfig.city}
      </p>
    </div>
  );
}
