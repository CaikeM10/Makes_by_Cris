export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;

  /** Preço à vista / PIX */
  price: number;

  /** Preço para pagamento no cartão de crédito */
  creditPrice: number;

  image: string;

  /** slug da categoria */
  category: string;

  brand: string;
  keywords: string[];
  variations?: string[];
  featured: boolean;
  bestSeller: boolean;
  available: boolean;
  active: boolean;
  createdAt: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
  variation?: string;
};

export type PaymentMethod =
  | "PIX"
  | "Cartão de crédito"
  | "Cartão de débito"
  | "Dinheiro";

export type FulfillmentMethod = "Retirada" | "Entrega";

export type CheckoutData = {
  name: string;
  whatsapp: string;
  payment: PaymentMethod;
  receivingMode: "store-pickup" | "delivery";
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  landmark: string;
};

export type OrderStatus = "Novo" | "Em andamento" | "Concluído" | "Cancelado";

export type Order = {
  id: string;
  customer: string;
  whatsapp: string;
  total: number;
  payment: PaymentMethod;
  fulfillment: FulfillmentMethod;
  createdAt: string;
  status: OrderStatus;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
};
