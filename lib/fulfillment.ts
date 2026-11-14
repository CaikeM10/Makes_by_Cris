import type { CheckoutData } from "@/lib/types";
import { storeConfig } from "@/lib/store-config";

export type FulfillmentLocation =
  | { type: "home-delivery"; city: "Poranga - CE" }
  | { type: "store-pickup"; city: "Ararendá - CE"; locationName: string }
  | { type: "delivery-point"; city: string; locationName: string; day: string };

export const fulfillmentLocations: readonly FulfillmentLocation[] = [
  { type: "home-delivery", city: "Poranga - CE" },
  { type: "store-pickup", city: "Ararendá - CE", locationName: "Makes by Cris Martins" },
  { type: "delivery-point", city: "Crateús - CE", locationName: "Mary Baby", day: "Terça-feira" },
  { type: "delivery-point", city: "Ipaporanga - CE", locationName: "Farmácia do Trabalhador BR", day: "Terça-feira" },
  { type: "delivery-point", city: "Ipueiras - CE", locationName: "Izzibida Acessórios", day: "Quinta-feira" },
  { type: "delivery-point", city: "Nova Russas - CE", locationName: "Mundo da Moda", day: "Sábado" },
];

export const fulfillmentLabels: Record<FulfillmentLocation["type"], string> = {
  "home-delivery": "Entrega no endereço do cliente",
  "store-pickup": "Retirada na loja",
  "delivery-point": "Ponto de entrega / retirada",
};

export function getFulfillmentLocation(city: string) {
  return fulfillmentLocations.find((location) => location.city === city);
}

export const otherCityValue = "other-city";
export const brazilianStates = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

export function isOtherCityDelivery(data: CheckoutData) {
  return data.receivingMode === "delivery" && data.city === otherCityValue;
}

// A retirada na sede é independente dos pontos de recebimento nas cidades.
export const storePickup = {
  city: storeConfig.city,
  locationName: storeConfig.name,
};

export function validateCheckout(data: CheckoutData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.name.trim().length < 3) errors.name = "Informe seu nome completo.";
  if (data.whatsapp.replace(/\D/g, "").length < 10)
    errors.whatsapp = "Informe um WhatsApp válido.";
  if (!["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito"].includes(data.payment))
    errors.payment = "Selecione a forma de pagamento.";
  if (data.receivingMode === "delivery") {
    const location = getFulfillmentLocation(data.city);
    const otherCity = isOtherCityDelivery(data);
    if (!location && !otherCity) errors.city = "Selecione uma cidade atendida.";
    if (otherCity) {
      if (!(data.deliveryCity?.trim())) errors.deliveryCity = "Informe a cidade da entrega.";
      if (!brazilianStates.some(uf => uf === data.deliveryState)) errors.deliveryState = "Selecione o estado da entrega.";
    }
    if (location?.type === "home-delivery" || otherCity) {
      if (!data.street.trim()) errors.street = "Informe a rua para entrega.";
      if (!data.district.trim()) errors.district = "Informe o bairro para entrega.";
    }
  } else if (data.receivingMode !== "store-pickup") {
    errors.receivingMode = "Selecione como deseja receber.";
  }
  return errors;
}
