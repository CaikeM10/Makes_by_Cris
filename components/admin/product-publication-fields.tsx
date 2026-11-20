import type { AdminProduct } from "@/lib/catalog/repository";
import { publicationFields } from "@/lib/catalog/validation";

const groups = [
  { label: "Publicação", fields: ["active", "available"] },
  { label: "Seções da Home", fields: ["featured", "best_seller", "gift_section", "new_arrival"] },
] as const;

export function ProductPublicationFields({ product }: { product: Pick<AdminProduct, keyof typeof publicationFields> }) {
  return <div className="catalog-panel catalog-publication">
    {groups.map(group => <fieldset key={group.label} className="catalog-publication-group">
      <legend>{group.label}</legend>
      <div className="catalog-checks">{group.fields.map(key => <label key={key}>
        <input type="checkbox" name={key} defaultChecked={product[key]} />{publicationFields[key]}
      </label>)}</div>
    </fieldset>)}
  </div>;
}
