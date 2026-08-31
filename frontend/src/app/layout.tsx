import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import axios from 'axios';
import { ClientToaster } from "@/components/ClientToaster";

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  let title = "Portfolio | Full Stack Developer";
  let description = "Modern portfolio showcasing projects, skills, and experience.";
  let keywords = "portfolio, developer, full stack";

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const res = await axios.get(`${API_URL}/settings`);
    if (res.data?.data) {
      const settings = res.data.data;
      if (settings.site_title) title = settings.site_title;
      if (settings.site_description) description = settings.site_description;
      if (settings.meta_keywords) keywords = settings.meta_keywords;
    }
  } catch (err: any) {
    // Suppress verbose fetch errors during build or if API is temporarily unavailable
    if (process.env.NODE_ENV === "development") {
      console.warn("generateMetadata: API not reachable, using default metadata.");
    }
  }

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "website",
    },
    icons: {
      icon: '/images/skyra-l1.png',
      shortcut: '/images/skyra-l1.png',
      apple: '/images/skyra-l1.png',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Prevent theme flash — reads localStorage before first paint */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='light'?false:true;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} font-sans min-h-screen transition-colors duration-300`} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {children}
        <div suppressHydrationWarning>
          <ClientToaster />
        </div>
      </body>
    </html>
  );
}
