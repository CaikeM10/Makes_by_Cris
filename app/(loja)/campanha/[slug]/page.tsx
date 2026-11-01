import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCampaign } from "@/lib/campaigns/public-server";
import { ProductGrid } from "@/components/product-grid";
import { CampaignArtwork } from "@/components/campaign-artwork";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const selection = await getPublicCampaign(slug);
  return selection ? { title: selection.campaign.title, description: selection.campaign.description } : { title: 'Campanha não encontrada', robots: { index: false } };
}
export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;
  const selection = await getPublicCampaign(slug);
  if (!selection) notFound();
  const { campaign, products } = selection;
  return <div className="container-boutique flex flex-col gap-8 py-8 lg:py-12">
    <header className="flex flex-col gap-3"><p className="eyebrow text-primary">{campaign.name}</p><h1 className="font-serif text-3xl lg:text-5xl">{campaign.title}</h1><p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{campaign.description}</p></header>
    <div className="overflow-hidden rounded-2xl bg-muted"><CampaignArtwork desktop={campaign.desktopUrl} mobile={campaign.mobileUrl || campaign.desktopUrl} /></div>
    <ProductGrid products={products} />
  </div>;
}
