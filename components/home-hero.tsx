import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { storeConfig } from "@/lib/store-config";
import type { CampaignBanner } from "@/lib/campaigns/model";
import { campaignHref } from "@/lib/campaigns/model";
import { CampaignArtwork } from "@/components/campaign-artwork";

export function HomeHero({ campaign }: { campaign?: CampaignBanner | null }) {
  const seasonal = !!campaign?.active && !!campaign.desktopUrl;
  return <section className="container-boutique pt-4 lg:pt-8" aria-label={seasonal ? campaign.name : 'Banner padrão'}>
    <div className={`home-hero ${seasonal ? 'home-hero-campaign' : 'home-hero-default'} relative overflow-hidden rounded-2xl bg-muted lg:rounded-3xl`}>
      {seasonal ? <CampaignArtwork desktop={campaign.desktopUrl} mobile={campaign.mobileUrl || campaign.desktopUrl} /> : <>
        <img src="/images/banner-editorial.png" alt="Modelo segurando um batom em cenário rosé" width={1024} height={1024}
          fetchPriority="high" decoding="async" className="home-hero-image lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover lg:object-right" />
        <div aria-hidden="true" className="home-hero-gradient lg:absolute lg:inset-0 lg:block lg:bg-gradient-to-r lg:from-background lg:via-background/85 lg:to-transparent" />
      </>}
      <div className={seasonal ? 'home-hero-copy flex flex-col items-start gap-4 px-5 py-6 sm:px-8 lg:px-10' : 'home-hero-copy relative flex flex-col items-start gap-3 px-5 py-5 sm:gap-4 sm:px-8 sm:py-7 lg:min-h-[340px] lg:max-w-lg lg:justify-center lg:gap-5 lg:px-10 lg:py-14'}>
        <p className="home-hero-eyebrow eyebrow text-primary">{seasonal ? campaign.name : storeConfig.tagline}</p>
        <h1 className="home-hero-title font-serif text-xl leading-[1.3] text-balance [overflow-wrap:anywhere] sm:text-3xl sm:leading-[1.25] lg:text-5xl">{seasonal ? campaign.title : 'Beleza selecionada, do jeito que combina com você'}</h1>
        <p className="home-hero-description max-w-xl text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{seasonal ? campaign.description : 'Perfumes, presentes e cuidados selecionados por Cris Martins. Escolha seus produtos e finalize o pedido pelo WhatsApp.'}</p>
        <LinkButton href={seasonal ? campaignHref(campaign.slug) : '/categorias'} variant="outline"
          className="group h-auto min-h-10 max-w-full gap-2 rounded-full border-foreground/20 bg-background/80 px-5 py-3 text-center text-xs whitespace-normal tracking-[0.14em] uppercase hover:border-primary hover:bg-primary hover:text-primary-foreground">
          <span className="min-w-0 [overflow-wrap:anywhere]">{seasonal ? campaign.button_text : 'Explorar catálogo'}</span><ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        </LinkButton>
      </div>
    </div>
  </section>;
}
