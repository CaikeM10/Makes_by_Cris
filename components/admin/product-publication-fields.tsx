import type { AdminProduct } from "@/lib/catalog/repository";
import { publicationFields } from "@/lib/catalog/validation";
export function ProductPublicationFields({ product }: { product: AdminProduct }) {
  return <fieldset className="catalog-panel"><legend>Publicação e seções</legend><div className="catalog-checks">{Object.entries(publicationFields).map(([key, label]) => <label key={key}><input type="checkbox" name={key} defaultChecked={product[key as keyof typeof publicationFields]} />{label}</label>)}</div></fieldset>;
}
