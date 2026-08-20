"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    let goneTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      leaveTimer = setTimeout(() => setPhase("leaving"), 2200);
      goneTimer = setTimeout(() => setPhase("gone"), 2800);
    } catch {
      setPhase("gone");
    }

    return () => {
      if (leaveTimer) clearTimeout(leaveTimer);
      if (goneTimer) clearTimeout(goneTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === "gone") return;

    let previous = "";

    try {
      previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch {
      return;
    }

    return () => {
      try {
        document.body.style.overflow = previous;
      } catch {
        // Não impede a desmontagem da splash.
      }
    };
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-100 transition-opacity duration-500 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        className="
          relative
          flex
          h-[100dvh]
          min-h-[100svh]
          w-full
          flex-col
          items-center
          justify-center
          overflow-hidden
          bg-blush
          px-6
        "
      >
        {/* =====================================================
            LOGO
            Mantida centralizada verticalmente.
            O translate-y foi removido porque a nova logo
            já não possui o espaçamento invisível anterior.
        ===================================================== */}
        <div
          className="
            animate-brand-rise
            flex
            w-[clamp(220px,62vw,280px)]
            items-center
            justify-center
            md:w-[clamp(260px,22vw,320px)]
          "
        >
          <img
            src="/logorenderizadacrisd.webp"
            alt="Makes by Cris Martins"
            className="
              block
              h-auto
              w-full
              object-contain
            "
          />
        </div>

        {/* =====================================================
            MENSAGEM
        ===================================================== */}
        <div
          className="
            mt-[clamp(8px,1.5vh,24px)]
            flex
            flex-col
            items-center
            gap-2
            animate-brand-rise
            [animation-delay:220ms]
          "
        >
          <p
            className="
              font-serif
              text-[clamp(2.1rem,5vw,2.5rem)]
              font-light
              leading-tight
              text-foreground
            "
          >
            Seja bem-vindo!
          </p>

          <p
            className="
              text-[clamp(0.9rem,3vw,1rem)]
              leading-relaxed
              text-muted-foreground
            "
          >
            É um prazer ter você aqui.
          </p>
        </div>

        {/* =====================================================
            COPYRIGHT
        ===================================================== */}
        <p
          className="
            absolute
            inset-x-0
            bottom-[max(1.5rem,env(safe-area-inset-bottom))]
            px-6
            text-center
            text-[0.6875rem]
            tracking-wide
            text-muted-foreground/80
            animate-brand-fade
            [animation-delay:600ms]
          "
        >
          Todos os direitos reservados © 2026 Crismartins.
        </p>
      </div>
    </div>
  );
}
