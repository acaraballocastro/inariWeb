import Image from "next/image";

const variants = {
  /** Fox beside the name, transparent background (public/icons/logo-horizontal.png). The web's logo. */
  horizontal: { src: "/icons/logo-horizontal.png", width: 720, height: 290 },
  /** Fox above the name (public/icons/logo.png). */
  stacked: { src: "/icons/logo.png", width: 326, height: 394 },
};

/** The INARI Tours logo, `width` pixels wide. */
export function Logo({ width = 160, variant = "horizontal", className = "" }: { width?: number; variant?: keyof typeof variants; className?: string }) {
  const image = variants[variant];
  return <Image src={image.src} alt="INARI Tours" width={width} height={Math.round((width * image.height) / image.width)} priority className={className} />;
}
