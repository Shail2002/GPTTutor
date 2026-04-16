"""
RAG Service - Retrieval Augmented Generation for FE524 Materials
"""

import json
import logging
from typing import List, Tuple
from app.config import settings

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    logging.warning("Chroma not available - vector DB disabled")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("OpenAI not available - LLM features disabled")

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self):
        """Initialize RAG service with vector DB and embeddings"""
        self.client = None
        self.collection = None
        self.openai_client = None
        
        # Initialize Chroma client
        if CHROMA_AVAILABLE:
            try:
                # Disable anonymized telemetry to avoid noisy posthog compatibility warnings.
                self.client = chromadb.PersistentClient(
                    path=settings.CHROMA_DB_PATH,
                    settings=ChromaSettings(anonymized_telemetry=False)
                )
                self.collection = self.client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info(f"Initialized Chroma collection: {settings.CHROMA_COLLECTION_NAME}")
            except Exception as e:
                logger.error(f"Failed to initialize Chroma: {e}")
        
        # Initialize OpenAI client
        if OPENAI_AVAILABLE and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-":
            try:
                # Use new OpenAI client API without proxies argument
                self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("Initialized OpenAI client")
            except Exception as e:
                logger.warning(f"OpenAI client initialization warning: {e}")

    def ensure_openai_client(self):
        """Lazily initialize the OpenAI client if startup initialization failed."""
        if self.openai_client:
            return self.openai_client

        if not (OPENAI_AVAILABLE and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-"):
            return None

        try:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("Initialized OpenAI client lazily")
            return self.openai_client
        except Exception as e:
            logger.warning(f"Lazy OpenAI client initialization warning: {e}")
            return None

    def embed_text(self, text: str) -> List[float]:
        """
        Embed text using OpenAI embeddings
        """
        if not self.ensure_openai_client():
            logger.warning("OpenAI client not available")
            return []
        
        try:
            response = self.openai_client.embeddings.create(
                input=text,
                model=settings.OPENAI_EMBEDDING_MODEL
            )
            embedding = response.data[0].embedding
            return embedding
        except Exception as e:
            logger.error(f"Failed to embed text: {e}")
            return []

    def chunk_document(self, text: str, chunk_size: int = None, overlap: int = None) -> List[str]:
        """
        Split document into chunks for embedding using word-based chunking
        """
        if chunk_size is None:
            chunk_size = settings.CHUNK_SIZE
        if overlap is None:
            overlap = settings.CHUNK_OVERLAP
        
        chunks = []
        words = text.split()
        current_chunk = []
        
        for word in words:
            current_chunk.append(word)
            if len(current_chunk) >= chunk_size:
                # Create chunk from current buffer
                chunk = " ".join(current_chunk[:chunk_size])
                chunks.append(chunk)
                # Maintain overlap for next chunk
                current_chunk = current_chunk[chunk_size - overlap:]
        
        # Add remaining words as final chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks

    def store_embeddings(self, material_id: str, chunks: List[str], material_name: str = ""):
        """
        Store document chunks and embeddings in vector DB
        """
        if not self.collection:
            logger.warning("Chroma collection not available")
            return
        
        try:
            # Embed all chunks
            embeddings = []
            chunk_texts = []
            ids = []
            
            for idx, chunk in enumerate(chunks):
                embedding = self.embed_text(chunk)
                if embedding:
                    embeddings.append(embedding)
                    chunk_texts.append(chunk)
                    ids.append(f"{material_id}_{idx}")
            
            # Store in Chroma
            if embeddings:
                self.collection.add(
                    ids=ids,
                    embeddings=embeddings,
                    documents=chunk_texts,
                    metadatas=[
                        {"material_id": material_id, "chunk_idx": idx, "material_name": material_name}
                        for idx in range(len(embeddings))
                    ]
                )
                logger.info(f"Stored {len(embeddings)} chunks for material {material_id}")
        except Exception as e:
            logger.error(f"Failed to store embeddings: {e}")

    def retrieve_relevant_chunks(self, query: str, top_k: int = None, material_ids: List[str] = None) -> List[dict]:
        """
        Retrieve relevant chunks for a query using similarity search
        Returns: [{"chunk": text, "material_id": id, "material_name": name, "score": similarity}]
        """
        if top_k is None:
            top_k = settings.TOP_K_RESULTS
        
        if not self.collection:
            logger.warning("Chroma collection not available")
            return []
        
        try:
            query_embedding = self.embed_text(query)
            if not query_embedding:
                logger.warning("Query embedding could not be generated")
                return []

            query_filter = None
            if material_ids:
                query_filter = {"material_id": {"$in": material_ids}}

            # Query the collection
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=query_filter
            )
            
            # Format results
            retrieved_chunks = []
            if results and results["documents"] and results["documents"][0]:
                for idx, doc in enumerate(results["documents"][0]):
                    distance = results["distances"][0][idx] if results["distances"] else 0
                    # Convert cosine distance to similarity score (0-1)
                    similarity_score = 1 - distance
                    
                    metadata = results["metadatas"][0][idx] if results["metadatas"] else {}
                    
                    retrieved_chunks.append({
                        "chunk": doc,
                        "material_id": metadata.get("material_id", ""),
                        "material_name": metadata.get("material_name", ""),
                        "score": similarity_score
                    })
            
            return retrieved_chunks
        except Exception as e:
            logger.error(f"Failed to retrieve chunks: {e}")
            return []

    def generate_answer(self, query: str, relevant_chunks: List[dict]) -> Tuple[str, List[str]]:
        """
        Generate answer using LLM with retrieved context
        Returns: (answer_text, sources_list)
        """
        if not self.ensure_openai_client():
            logger.warning("OpenAI client not available")
            return "OpenAI API not configured", []
        
        try:
            # Build context from retrieved chunks
            context_text = "\n\n".join([
                f"From {chunk['material_name']} (relevance: {chunk['score']:.2f}):\n{chunk['chunk']}"
                for chunk in relevant_chunks
            ])
            
            # Get unique sources
            sources = list(set([chunk["material_name"] for chunk in relevant_chunks]))
            
            # Build prompt
            prompt = PromptService.CHAT_PROMPT_TEMPLATE.format(
                context=context_text,
                query=query
            )
            
            # Call the chat model with a fallback if the configured model is unavailable
            model_candidates = [settings.OPENAI_MODEL, "gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"]
            last_error = None
            response = None

            for model_name in dict.fromkeys(model_candidates):
                try:
                    response = self.openai_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": PromptService.SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=settings.OPENAI_TEMPERATURE,
                        max_tokens=1024
                    )
                    break
                except Exception as model_error:
                    last_error = model_error

            if response is None:
                raise last_error
            
            answer = response.choices[0].message.content
            return answer, sources
        except Exception as e:
            logger.error(f"Failed to generate answer: {e}")
            return f"Error generating answer: {str(e)}", []

class PromptService:
    """Prompt templates for FE524-specific queries"""
    
    SYSTEM_PROMPT = """You are an expert AI tutor for FE524 Financial Engineering at Columbia University. 
Your role is to help students understand complex financial concepts, derivatives, risk management, and quantitative methods.

Guidelines:
- Always ground answers in the provided course materials
- Use clear, accessible language but maintain mathematical rigor
- Provide examples and intuition alongside equations
- If something isn't covered in materials, clearly state it's beyond course scope
- Cite specific materials when possible
"""

    CHAT_PROMPT_TEMPLATE = """Context from course materials:
{context}

Student question: {query}

Provide a clear, accurate answer that:
1. Is grounded in the provided materials
2. Explains concepts with both intuition and rigor
3. Provides relevant examples from FE524
4. Cites sources from the materials"""

    SUMMARY_PROMPT_TEMPLATE = """Please summarize the following course material concisely.

Material:
{content}

Provide:
1. A {length} summary (2-3 paragraphs for short, 4-6 for medium, 6-10 for long)
2. Key takeaways (3-5 bullet points)
3. Important formulas or concepts to remember
4. Common misconceptions to avoid"""

    FLASHCARD_PROMPT_TEMPLATE = """Create {count} high-quality flashcards from this material.

Material:
{content}

Format: Return a JSON array of objects with "question" and "answer" keys.
Focus on:
- Key definitions and formulas
- Conceptual understanding
- Problem-solving approaches
- Real-world applications to FE524 topics"""

    QUIZ_PROMPT_TEMPLATE = """Generate {questions} quiz questions from this material.

Material:
{content}

Format: Return a JSON array with objects containing:
- "question": The question text
- "options": Array of 4 possible answers
- "correct_answer": Index of correct answer (0-3)
- "explanation": Why this is correct

Focus on:
- Core concepts understanding
- Application to financial scenarios
- Quantitative problem-solving
- Recognizing key relationships"""

rag_service = RAGService()
prompt_service = PromptService()
