import dynamic from "next/dynamic";

const PlanBApp = dynamic(() => import("../components/PlanBApp"), {
  ssr: false,
});

export default function Home() {
  return <PlanBApp />;
}
