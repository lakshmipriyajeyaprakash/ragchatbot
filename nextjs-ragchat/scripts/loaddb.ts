import { DataAPIClient } from "@datastax/astra-db-ts"
import { GoogleGenAI } from "@google/genai"
import fs from "fs"
import path from "path"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

import "dotenv/config"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY,
} = process.env

// Connect to AstraDB
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!)
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_NAMESPACE! })

// Google Generative AI for embeddings
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY! })

// Text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
})

async function loadPDFs() {
    await db.createCollection(ASTRA_DB_COLLECTION!, {
        vector: { dimension: 768, metric: "cosine" },
    }).catch(() => console.log("Collection already exists, skipping creation"))

    const collection = db.collection(ASTRA_DB_COLLECTION!)

    const docsDir = path.join(__dirname, "../docs")
    const pdfPaths = fs.readdirSync(docsDir)
        .filter(file => file.endsWith(".pdf"))
        .map(file => path.join(docsDir, file))

    for (const pdfPath of pdfPaths) {
        const loader = new PDFLoader(pdfPath)
        const docs = await loader.load()
        const chunks = await textSplitter.splitDocuments(docs)

        const records = []
        for (const chunk of chunks) {
            // Remove page numbers and noise from PDF text
            const cleanedText = chunk.pageContent
                .replace(/^\s*\d+\s*$/gm, "")           // standalone page numbers on their own line
                .replace(/\bpage\s+\d+\b/gi, "")        // "Page 5", "page 12"
                .replace(/\b\d+\s*of\s*\d+\b/gi, "")    // "5 of 20"
                .replace(/\n{3,}/g, "\n\n")              // collapse excess blank lines
                .trim()

            if (!cleanedText) continue

            let result
            while (true) {
                try {
                    result = await genAI.models.embedContent({
                        model: "gemini-embedding-001",
                        contents: cleanedText,
                        config: { outputDimensionality: 768 },
                    })
                    break
                } catch (err: any) {
                    if (err?.status === 429) {
                        console.log("Rate limit hit, waiting 60s...")
                        await new Promise(res => setTimeout(res, 60000))
                    } else if (err?.status === 503) {
                        console.log("Service unavailable, retrying in 10s...")
                        await new Promise(res => setTimeout(res, 10000))
                    } else {
                        throw err
                    }
                }
            }
            records.push({
                text: cleanedText,
                $vector: result!.embeddings![0].values,
                metadata: chunk.metadata,
            })
        }

        await collection.insertMany(records)
        console.log(`Loaded ${chunks.length} chunks from ${pdfPath}`)
    }
}

loadPDFs().then(() => console.log("Done")).catch(console.error)
