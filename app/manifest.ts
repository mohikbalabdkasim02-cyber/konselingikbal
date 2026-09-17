import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bina Insan LifeMap",
    short_name: "LifeMap",
    description: "Student development, asesmen BK, Life Map, karier, action plan, dan pendampingan Bina Insan Palu High School.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F7FA",
    theme_color: "#083E59",
    lang: "id-ID",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
