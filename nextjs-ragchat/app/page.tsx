"use client"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import Image from "next/image"
import raglogo from "./assets/raglogo.png"

type Message = {
    role: "user" | "assistant"
    text: string
}

export default function Home() {
    const [question, setQuestion] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!question.trim() || loading) return

        const userMessage = question.trim()
        setMessages(prev => [...prev, { role: "user", text: userMessage }])
        setQuestion("")
        setLoading(true)

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: userMessage }),
            })
            const data = await res.json()
            setMessages(prev => [...prev, { role: "assistant", text: data.answer }])
        } catch {
            setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

            {/* Header */}
            <header className="flex items-center justify-center gap-3 px-6 py-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur">
                <Image src={raglogo} alt="RAG Chatbot Logo" width={32} height={32} className="rounded-lg" />
                <div>
                    <h1 className="text-white font-semibold text-lg leading-none">RAG Chatbot</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Powered by Gemini + AstraDB</p>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold">
                            AI
                        </div>
                        <div>
                            <p className="text-white font-medium text-lg">How can I help you?</p>
                            <p className="text-slate-400 text-sm mt-1">Ask anything about your documents</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 mt-2 w-full max-w-sm">
                            {["What topics are covered in the documents?", "Explain the CSS box model", "What is JavaScript used for?"].map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => setQuestion(suggestion)}
                                    className="text-left text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 transition"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>

                        {/* Avatar for assistant */}
                        {m.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1">
                                AI
                            </div>
                        )}

                        <div className={`max-w-[78%] px-4 py-3 text-sm shadow-lg ${
                            m.role === "user"
                                ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl rounded-br-sm"
                                : "bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl rounded-bl-sm"
                        }`}>
                            {m.role === "user" ? (
                                <p>{m.text}</p>
                            ) : (
                                <div className="prose prose-sm prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-200 prose-strong:text-white prose-code:text-blue-300 prose-li:text-slate-200">
                                    <ReactMarkdown>{m.text}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        {/* Avatar for user */}
                        {m.role === "user" && (
                            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1">
                                U
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading dots */}
                {loading && (
                    <div className="flex items-end gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            AI
                        </div>
                        <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-slate-700 bg-slate-900/80 backdrop-blur">
                <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
                    <input
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        placeholder="Ask about your documents..."
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        Send
                    </button>
                </form>
                <p className="text-center text-slate-600 text-xs mt-2">AI can make mistakes. Verify important information.</p>
            </div>

        </main>
    )
}
