import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { NavBar } from "@/components/nav-bar";
import { auth } from "@/lib/auth";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daybook",
  description: "A calm, personal daily companion for tasks, journaling, and habits.",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("daybook-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-bg text-text">
        <ThemeProvider>
          <NavBar user={session?.user ? { name: session.user.name ?? "" } : null} />
          <main className="flex-1 w-full">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
