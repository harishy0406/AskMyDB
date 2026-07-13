import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AskMyDB - Chat with your data. No SQL required.",
  description:
    "Upload a file or connect a database and ask questions in plain English. AI generates SQL, shows results as tables and charts.",
  openGraph: {
    title: "AskMyDB - Chat with your data. No SQL required.",
    description:
      "Upload a file or connect a database and ask questions in plain English. AI generates SQL, shows results as tables and charts.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
