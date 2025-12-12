import "./globals.css";
import { GeistSans } from "geist/font/sans";

export const metadata = {
  title: "Agenda PRO",
  description: "Agenda PRO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={GeistSans.className + " bg-background text-foreground"}>
        {children}
      </body>
    </html>
  );
}
