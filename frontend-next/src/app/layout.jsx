import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import I18nProvider from "@/components/I18nProvider";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "REVA AI — Intelligent Complaint Portal",
    description:
        "REVA AI - Secure, multilingual AI-powered police complaint filing system. File complaints with voice, track status, and get real-time assistance.",
    keywords:
        "police complaint, FIR filing, AI complaint, REVA, law enforcement",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link
                    rel="icon"
                    type="image/svg+xml"
                    href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>"
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <I18nProvider>
                    <AuthProvider>
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: "var(--clr-surface-2)",
                                    color: "var(--clr-text)",
                                    border: "1px solid var(--clr-border)",
                                    fontFamily: "var(--font-sans)",
                                },
                            }}
                        />
                        {children}
                    </AuthProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
