"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/components/store-provider";
import { formatCurrency, maskCep, maskPhone } from "@/lib/format";
import { getCartTotal, getLineTotal } from "@/lib/pricing";
import { storeConfig } from "@/lib/store-config";
import type {
  CheckoutData,
  FulfillmentMethod,
  PaymentMethod,
} from "@/lib/types";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const payments: PaymentMethod[] = [
  "PIX",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
];
const fulfillments: FulfillmentMethod[] = ["Retirada", "Entrega"];

const emptyData: CheckoutData = {
  name: "",
  whatsapp: "",
  payment: "PIX",
  fulfillment: "Retirada",
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: storeConfig.city,
  landmark: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearBag } = useStore();
  const [data, setData] = useState<CheckoutData>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDelivery = data.fulfillment === "Entrega";

  const orderTotal = getCartTotal(items, data.payment);

  const message = useMemo(
    () => buildOrderMessage(items, data),
    [items, data],
  );

  const update = <K extends keyof CheckoutData>(
    key: K,
    value: CheckoutData[K],
  ) => {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (data.name.trim().length < 3) next.name = "Informe seu nome completo.";
    if (data.whatsapp.replace(/\D/g, "").length < 10)
      next.whatsapp = "Informe um WhatsApp válido.";

    if (isDelivery) {
      if (!data.street.trim()) next.street = "Informe a rua.";
      if (!data.number.trim()) next.number = "Informe o número.";
      if (!data.district.trim()) next.district = "Informe o bairro.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error("Sua sacola está vazia.");
      return;
    }

    if (!validate()) {
      toast.error("Confira os campos destacados.");
      return;
    }

    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    toast.success("Pedido enviado para o WhatsApp!", {
      description: "Conclua a conversa para confirmar pagamento e entrega.",
    });
    clearBag();
    router.push("/pedido-enviado");
  };

  if (items.length === 0) {
    return (
      <div className="container-boutique flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-serif text-3xl">Sua sacola está vazia</h1>
        <p className="text-sm text-muted-foreground">
          Adicione produtos antes de finalizar o pedido.
        </p>
        <LinkButton href="/categorias" className="mt-2 h-11 rounded-full px-7">
          Ver produtos
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="container-boutique flex flex-col gap-8 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <Link
          href="/sacola"
          className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Voltar para a sacola
        </Link>
        <p className="eyebrow text-primary">Última etapa</p>
        <h1 className="font-serif text-3xl leading-tight lg:text-4xl">
          Finalizar pedido
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Preencha seus dados e enviaremos o resumo completo para o WhatsApp da
          loja.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14"
      >
        <div className="flex flex-col gap-10">
          {/* Dados pessoais */}
          <fieldset className="flex flex-col gap-5">
            <legend className="eyebrow mb-3 text-muted-foreground">
              Seus dados
            </legend>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Como podemos te chamar?"
                aria-invalid={Boolean(errors.name)}
                className="h-12 rounded-xl"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="whatsapp">Seu WhatsApp</Label>
              <Input
                id="whatsapp"
                inputMode="numeric"
                value={data.whatsapp}
                onChange={(event) =>
                  update("whatsapp", maskPhone(event.target.value))
                }
                placeholder="(88) 90000-0000"
                aria-invalid={Boolean(errors.whatsapp)}
                className="h-12 rounded-xl"
              />
              {errors.whatsapp && (
                <p className="text-xs text-destructive">{errors.whatsapp}</p>
              )}
            </div>
          </fieldset>

          {/* Pagamento */}
          <fieldset className="flex flex-col gap-3">
            <legend className="eyebrow mb-3 text-muted-foreground">
              Forma de pagamento
            </legend>
            <RadioGroup
              value={data.payment}
              onValueChange={(value) =>
                update("payment", value as PaymentMethod)
              }
              className="grid gap-3 sm:grid-cols-2"
            >
              {payments.map((option) => (
                <Label
                  key={option}
                  htmlFor={`payment-${option}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3.5 text-sm transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary"
                >
                  <RadioGroupItem id={`payment-${option}`} value={option} />
                  {option}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          {/* Entrega */}
          <fieldset className="flex flex-col gap-3">
            <legend className="eyebrow mb-3 text-muted-foreground">
              Como deseja receber
            </legend>
            <RadioGroup
              value={data.fulfillment}
              onValueChange={(value) =>
                update("fulfillment", value as FulfillmentMethod)
              }
              className="grid gap-3 sm:grid-cols-2"
            >
              {fulfillments.map((option) => (
                <Label
                  key={option}
                  htmlFor={`fulfillment-${option}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3.5 text-sm transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary"
                >
                  <RadioGroupItem
                    id={`fulfillment-${option}`}
                    value={option}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    {option}
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {option === "Retirada"
                        ? `Combine o horário em ${storeConfig.city}`
                        : "Informe o endereço para entrega"}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          {/* Endereço */}
          {isDelivery && (
            <fieldset className="flex flex-col gap-5">
              <legend className="eyebrow mb-3 text-muted-foreground">
                Endereço de entrega
              </legend>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    inputMode="numeric"
                    value={data.cep}
                    onChange={(event) =>
                      update("cep", maskCep(event.target.value))
                    }
                    placeholder="63700-000"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="district">Bairro</Label>
                  <Input
                    id="district"
                    value={data.district}
                    onChange={(event) => update("district", event.target.value)}
                    aria-invalid={Boolean(errors.district)}
                    className="h-12 rounded-xl"
                  />
                  {errors.district && (
                    <p className="text-xs text-destructive">
                      {errors.district}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={data.street}
                    onChange={(event) => update("street", event.target.value)}
                    aria-invalid={Boolean(errors.street)}
                    className="h-12 rounded-xl"
                  />
                  {errors.street && (
                    <p className="text-xs text-destructive">{errors.street}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={data.number}
                    onChange={(event) => update("number", event.target.value)}
                    aria-invalid={Boolean(errors.number)}
                    className="h-12 rounded-xl"
                  />
                  {errors.number && (
                    <p className="text-xs text-destructive">{errors.number}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={data.complement}
                    onChange={(event) =>
                      update("complement", event.target.value)
                    }
                    placeholder="Apto, bloco, casa"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={data.city}
                    onChange={(event) => update("city", event.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="landmark">Ponto de referência</Label>
                  <Textarea
                    id="landmark"
                    value={data.landmark}
                    onChange={(event) => update("landmark", event.target.value)}
                    placeholder="Próximo à praça, portão branco..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </fieldset>
          )}
        </div>

        {/* Resumo */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-5 rounded-3xl bg-secondary p-6">
            <h2 className="font-serif text-xl">Resumo do pedido</h2>

            <ul className="flex flex-col gap-3 text-sm">
              {items.map((item) => (
                <li
                  key={`${item.product.id}-${item.variation ?? ""}`}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="text-secondary-foreground/85">
                    {item.quantity}x {item.product.name}
                    {item.variation && (
                      <span className="text-secondary-foreground/60">
                        {" "}
                        · {item.variation}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatCurrency(getLineTotal(item, data.payment))}
                  </span>
                </li>
              ))}
            </ul>

            <div aria-live="polite" className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-secondary-foreground/75">
                  Subtotal dos produtos
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(orderTotal)}
                </span>
              </div>

              <p className="text-sm text-secondary-foreground/75">Pagamento: {data.payment}</p>

              <div className="mt-1 flex items-baseline justify-between gap-4">
                <span className="eyebrow text-secondary-foreground/75">
                  Total
                </span>
                <span className="font-serif text-3xl text-primary">
                  {formatCurrency(orderTotal)}
                </span>
              </div>

            </div>

            <Button type="submit" size="lg" className="h-13 gap-2 rounded-full">
              <MessageCircle className="size-4" aria-hidden="true" />
              Enviar pedido no WhatsApp
            </Button>

            <p className="text-center text-xs leading-relaxed text-secondary-foreground/70">
              Você será levado ao WhatsApp {storeConfig.whatsappDisplay} com a
              mensagem pronta.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
