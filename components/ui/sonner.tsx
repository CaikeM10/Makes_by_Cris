"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      richColors={false}
      expand={false}
      closeButton={false}
      visibleToasts={3}
      offset={16}
      icons={{
        success: <CircleCheckIcon className="size-5 text-[#A95A66]" />,
        info: <InfoIcon className="size-5 text-[#A95A66]" />,
        warning: <TriangleAlertIcon className="size-5 text-[#C48A4A]" />,
        error: <OctagonXIcon className="size-5 text-[#C45858]" />,
        loading: <Loader2Icon className="size-5 animate-spin text-[#A95A66]" />,
      }}
      toastOptions={{
        duration: 2400,
        classNames: {
          toast:
            "group rounded-[18px] border border-[#EBD7D8] bg-[#FFFCFB] px-4 py-3 shadow-[0_10px_30px_rgba(91,64,68,0.10)]",
          title: "text-[15px] font-semibold text-[#3F2A2D] leading-none",
          description:
            "mt-1 text-[13px] font-medium text-[#6B4B4F] leading-snug",
        },
      }}
      style={
        {
          "--normal-bg": "#FFFCFB",
          "--normal-text": "#3F2A2D",
          "--normal-border": "#EBD7D8",
          "--border-radius": "18px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
