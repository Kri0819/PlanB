import dynamic from "next/dynamic";

// The app is a self-contained, highly interactive client component
// (local React state, animations, no server data), so it's loaded
// client-side only to avoid any SSR/hydration mismatches.
const PlanBApp = dynamic(() => import("../components/PlanBApp"), {
  ssr: false,
});

export default function Home() {
  return <PlanBApp />;
}
