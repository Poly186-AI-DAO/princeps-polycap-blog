import InsightRoll from "@/src/components/About/InsightRoll";


const insights = [
  "Self-taught Kenyan systems architect",
  "Founder of Poly — AI digital worker OS",
  "Designing SESAP smart social contracts",
  "Automating food, water, energy, shelter",
  "Terraforming Sahara moonshot researcher",
  "Senior Partner @ Power Moves",
  "Building Poly186 in public every day",
]

export default function AboutLayout({ children }) {
  return (
    <main className="w-full flex flex-col items-center justify-between">
      <InsightRoll insights={insights} />
      {children}
    </main>
  );
}
