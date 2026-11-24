import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { themeScript } from "@/lib/theme";
import "@/styles/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-display-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Nova — AI chat that feels alive", template: "%s · Nova" },
  description:
    "Nova is a real-time AI chatbot built with Next.js, Tailwind CSS, Express, Socket.io and MongoDB. Streamed answers, chat history, personalisation and analytics.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080f" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} dark h-full antialiased`}
      data-accent="violet"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!bg-panel-solid !border-line !text-fg !rounded-2xl !shadow-2xl",
              description: "!text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
