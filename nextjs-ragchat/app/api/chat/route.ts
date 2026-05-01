import { DataAPIClient } from "@datastax/astra-db-ts"
import { GoogleGenAI } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY,
} = process.env

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!)
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_NAMESPACE! })

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY! })

export async function POST(req: NextRequest) {
    const { question } = await req.json()

    // 1. Embed the user question
    const embeddingResult = await genAI.models.embedContent({
        model: "gemini-embedding-001",
        contents: question,
        config: { outputDimensionality: 768 },
    })
    const queryVector = embeddingResult.embeddings![0].values!

    // 2. Retrieve top 5 relevant chunks from AstraDB
    const collection = db.collection(ASTRA_DB_COLLECTION!)
    const results = await collection.find({}, {
        sort: { $vector: queryVector },
        limit: 5,
        projection: { text: 1 },
    }).toArray()

    const context = results.map(r => r.text).join("\n\n")

    // 3. Build prompt combining context + question
    const prompt = `You are a helpful and knowledgeable assistant with complete expertise in all areas of front-end development, including HTML, CSS, JavaScript, TypeScript, React, Next.js, browser APIs, performance optimization, accessibility, design patterns, and all related concepts and techniques.

Answer the question using the following priority order:
1. If the Reference Context below contains relevant information, use it as your PRIMARY source — this is the most important rule.
2. If the Reference Context is partially relevant, use it first and then supplement with your own knowledge to give a complete answer.
3. If the Reference Context has no relevant information, answer fully and confidently from your own expertise — especially for any front-end development concept.

Never refuse to answer or say the documents don't cover a topic. Always deliver a complete, helpful response.

Important formatting rules:
- Do NOT mention page numbers, section numbers, or document references in your response.
- Write naturally as if the knowledge is your own — do not say "according to section X", "on page Y", or "the provided text does not contain...".
- Focus only on delivering clear, accurate, and helpful content.

Reference Context:
${context}

Question: ${question}`

    // 4. Call Gemini and return the response
    const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
    })
    const answer = response.text

    return NextResponse.json({ answer })
}
