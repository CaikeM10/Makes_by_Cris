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
