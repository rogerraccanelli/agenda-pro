import "./globals.css";
import { GeistSans } from "geist/font/sans";

export const metadata = {
  title: "Agenda PRO",
  description: "Agenda PRO",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${GeistSans.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
