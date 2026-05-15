import { GoogleTagManager } from "@next/third-parties/google";

export default function GTMScript() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
  if (!GTM_ID) return null;

  return <GoogleTagManager gtmId={GTM_ID} />;
}
