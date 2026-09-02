import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckFlow } from "./CheckFlow";

// The step-by-step bill check (T7): intake → results → documents → guidance.
// Server component shell; the interactive flow is the client `CheckFlow`.
export default function CheckPage() {
  return (
    <>
      <Header />
      <CheckFlow />
      <Footer />
    </>
  );
}
