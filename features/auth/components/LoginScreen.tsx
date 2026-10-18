import { LoginPanel } from "./LoginPanel";
import { LoginHero } from "./LoginHero";

export function LoginScreen() {
  return (
    <main className="flex min-h-dvh w-full bg-[#eeeeec]">
      <section className="grid min-h-dvh w-full overflow-hidden bg-[#f8f7f3] lg:grid-cols-[minmax(420px,0.88fr)_minmax(0,1.12fr)]">
        <LoginPanel />
        <LoginHero />
      </section>
    </main>
  );
}