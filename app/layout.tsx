import type { Metadata } from "next";
import "./globals.css";
import "./language-menu.css";
import "./language-dialog.css";
import "./dark-theme.css";
import "./settings-appearance.css";
import "./mobile-settings-polish.css";
import "./profile-safe-polish.css";
import "./mobile-smooth.css";
import "./profile-discovery.css";
import "./credits.css";
import "./wallet.css";
import ThemeBoot from "./theme-boot";

export const metadata: Metadata = {
  title: "Wildball Media",
  description: "Basketball lives here."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeBoot/><div id="google_translate_element" aria-hidden="true" />{children}</body></html>;
}
