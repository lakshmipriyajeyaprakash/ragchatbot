import type { Metadata } from "next"
import "./global.css"

export const metadata: Metadata = {
    title: "PDF RAG Chatbot",
    description: "Chat with your PDF documents",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-slate-900 antialiased">{children}</body>
        </html>
    )
}
