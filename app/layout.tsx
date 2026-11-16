import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hobimoto | Stok Yönetimi",
  description: "Hobimoto barkodlu stok takip ve envanter yönetimi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
