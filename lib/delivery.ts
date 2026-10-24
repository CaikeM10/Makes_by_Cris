import { formatCurrency } from "@/lib/format";
import { storeConfig } from "@/lib/store-config";

export const deliveryFeeLabel = storeConfig.deliveryFee === 0
  ? "Grátis"
  : formatCurrency(storeConfig.deliveryFee);

export const deliveryNotice = storeConfig.deliveryFee === 0
  ? "Frete grátis nas cidades atendidas"
  : `Frete: ${deliveryFeeLabel} nas cidades atendidas`;
