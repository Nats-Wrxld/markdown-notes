import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UrSpace - Your personal notebook",
  description: "A calm corner to collect ideas, little reminders, and everything you don't want to forget.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="urspace-theme-bootstrap" strategy="beforeInteractive">
          {`try {
  var savedTheme = window.localStorage.getItem("urspace:theme");
  document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
