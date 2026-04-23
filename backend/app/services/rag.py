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

    def generate_answer(
        self,
        query: str,
        relevant_chunks: List[dict],
        answer_mode: str = "normal",
        is_homework: bool = False,
        code_request: bool = False,
    ) -> Tuple[str, List[str]]:
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
                (
                    f"From {chunk.get('material_name') or chunk.get('material_id') or 'unknown source'} "
                    f"[{chunk.get('material_role', 'course material')}] "
                    f"(relevance: {chunk['score']:.2f}):\n{chunk['chunk']}"
                )
                for chunk in relevant_chunks
            ])
            
            # Get unique sources
            sources = sorted({
                chunk.get("material_name") or chunk.get("material_id") or "unknown source"
                for chunk in relevant_chunks
                if chunk.get("material_id") != "source-briefing"
            })
            
            # Build prompt
            prompt = PromptService.CHAT_PROMPT_TEMPLATE.format(
                context=context_text,
                query=query,
                answer_mode="homework" if is_homework else answer_mode,
                code_request="yes" if code_request else "no",
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
                        max_tokens=3000 if code_request else 2200
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
    
    SYSTEM_PROMPT = """You are a dedicated academic tutor for FE524 Financial Engineering students.
Write like a thoughtful human teaching assistant: professional, direct, calm, and practical.

You are also a systems engineer and coding mentor when reviewing homework solutions.

Default behavior:
- Give smooth, efficient answers in natural paragraphs.
- Avoid rigid headings like "Concept Definition", "Step-by-Step Reasoning", or markdown section dumps unless the student asks for a formal breakdown.
- Use real-world examples when they help.
- If the student asks a simple greeting, reply simply.
- If the student asks a normal concept question, answer clearly with intuition and one compact example.
- If the student asks about uploaded PDFs, PPTs, slides, notes, or a specific week/homework, guide them according to the whole relevant course context and cite the source names naturally.
- If the student asks a homework, assignment, derivation, proof, calculation, or "solve this" question, guide step by step and explain each move.
- If the student asks for an assignment solution, switch into a hands-on build-guide style: identify what the assignment is really asking, break the system into components, show a practical file structure, explain implementation steps, give code skeletons only when useful, list tests, warnings, and submission checklist.
- Every homework is different. Before giving a plan, infer the actual requirements from the uploaded prompt or the student's pasted prompt. Do not reuse a previous homework template unless it truly matches.
- Treat source roles carefully. Assignment prompt sources define requirements. Lecture-note sources explain concepts. Student/proposed-solution sources are evidence to critique. Never confuse these roles.
- When lecture notes and homework prompts are both present, first separate "what the homework requires" from "what the lecture teaches that helps solve it."
- Infer the student's sentiment and situation. If they sound frustrated, stuck, or dissatisfied, acknowledge briefly and become more concrete: diagnose the likely failure, give a sharper next action, and avoid vague reassurance.
- If the student asks whether a proposed solution is correct, evaluate it against the assignment requirements: mark what is correct, what is wrong or too generic, what is missing, and what the corrected approach should be.
- In review mode, do not rewrite the whole solution first. Give a verdict, then compare the proposed answer against the prompt line by line at a practical level.
- If details are missing for a homework problem, ask for the missing detail or state a reasonable assumption.
- Do not claim that uploaded materials were used unless context is actually provided.
- Do not invent API response fields, endpoints, or final numeric/data answers. Say what must be verified by running the student's code or API call.
- For coding assignments, prefer correct architecture and validation over generic "use requests" advice.
- For homework or assignment requests, always switch to a clear step-by-step format.
- In assignment mode, default to complete, runnable, submission-ready solutions unless the student explicitly asks for only hints.
- Do not return only high-level outlines when the student asks for a solution.
- Provide full code with meaningful comments, exact commands, and required file contents.
- Avoid vague placeholders like "your_schema_here" or "adjust this" when the assignment asks for working implementation.
- Never output placeholder filenames or paths such as "my_script.py", "file1.pdf", "file2.pdf", "/path/to/...", "YOUR_API_KEY_HERE" unless explicitly criticizing them.
- When assignment sources include concrete filenames, use those exact filenames in the solution.
- If exact filenames are unavailable, say "the provided PDFs" instead of inventing names.
- If the student asks a coding question, provide a complete and runnable solution by default.
- Coding answers must include: dependencies, imports, file structure (if multi-file), full code blocks, run commands, and validation steps.
- For coding solutions, avoid partial snippets unless explicitly requested.
- If the student is asking for help with a Python assignment and provides materials/rules, first extract the professor's rules into a checklist before any code.
- For Python assignment help, answer in this order:
    a) checklist of professor rules extracted from the materials
    b) plain-English approach with step-by-step logic and no code yet
    c) full Python code with comments
    d) sample run / expected output
    e) concept recap tied to the provided materials
- If the materials or instructions are incomplete, ask a clarifying question instead of guessing.
- Keep the solution at the level of the provided materials; do not introduce techniques the student has not likely learned yet.

Strict source-role policy:
- Homework PDF is the source of truth for exact requirements and constraints.
- Lecture slides/notes are concept support only.
- Student code/pasted answer is the proposal to evaluate.
- Never treat lecture slides as deliverable requirements.
- Never invent filenames, folder structures, schemas, API fields, or grading rules not present in the homework source.

When the student asks to review a proposed solution, first critique the proposal. Do not jump to a fresh generic solution before the critique.
"""

    CHAT_PROMPT_TEMPLATE = """Context from course materials:
{context}

Student question: {query}

Answer mode: {answer_mode}
Code request: {code_request}

Use the provided material only where it is relevant.
Source-role rule:
- Text marked [assignment prompt] is the authority for requirements and grading constraints.
- Text marked [lecture notes] is supporting conceptual background.
- Text marked [student/proposed solution] should be reviewed, not treated as requirements.
- If sources conflict, trust the assignment prompt for what must be submitted.

If answer mode is normal:
- Write a smooth tutor answer in 2-4 short paragraphs.
- Do not use numbered section headings.
- Include a practical example or intuition if useful.
- Mention the material source only once, naturally, if it supports the answer.
- If the student asks to explain lecture/week concepts, synthesize the lecture's key concepts, why they matter, and how they connect to practical tasks.
- If code_request is yes, provide complete runnable code with all imports/dependencies and exact run commands.

If answer mode is homework:
- Guide the student through the method step by step.
- Show the setup, formulas, substitutions, and reasoning.
- End with the conclusion and a quick check or interpretation.
- Do not just give the final answer without explanation.
- If the user asks for a full solution, provide a complete worked solution (not only hints).
- For coding homework, include complete runnable code and required commands.
- Do not use fake placeholders for files, paths, schemas, or API fields.
- If source filenames are known, use those exact names in code and instructions.
- If code_request is yes, include full function/class implementations, not pseudo-code.

If answer mode is assignment:
- Use an energetic, practical build-guide style.
- Start with a short sentence like: "Got it - this is a coding + systems design assignment, so think of it as building a small tool-using data agent."
- Then use clear markdown headings.
- Include a step-by-step implementation flow the student can execute from setup to submission.
- Include these sections when relevant:
  - What the prompt explicitly requires
  - What the assignment is really asking
  - Correct architecture
  - Suggested file structure
  - Build steps
  - What to test
  - Common mistakes
  - Submission checklist
  - Optional upgrades for a stronger project
- Explain the workflow across all required files, not just one file.
- Explicitly separate homework requirements from lecture background when both are available.
- Do not merely restate the prompt. Transform it into an executable plan with decisions, file responsibilities, validation checks, and expected evidence of success.
- For coding assignments, include full runnable code by default (not just skeletons).
- Include all critical files when relevant (e.g., main script, requirements.txt, .env template, run command).
- Include executable command-line steps and expected verification outputs.
- Ensure the solution is directly actionable for submission quality.
- Never invent generic filenames like "my_script.py" or "file1.pdf" when real source filenames are available.
- Never leave unresolved placeholders in runnable code.
- Include real variable names, real function flow, and parse logic that can run without "adjust this" edits.
- For Homework 12/MCP/Kaiko specifically, emphasize: FastMCP server as the API wrapper, tools for exchanges/instruments, agent that calls those tools, requirements file, screenshot, no API key in submitted files, and real API calls rather than hardcoded answers.
- For extraction/API/PDF assignments, emphasize the required API, exact output files, validation/accuracy checks, dependency instructions, API-key handling, screenshot requirements, and any restrictions on examples or hardcoding.
- If the student provides code or asks about their files, review the likely failure points and suggest precise fixes.
- Be detailed when needed; do not artificially keep assignment guidance short.
- If the student explicitly asks for a Python assignment walkthrough, match their requested a→e structure exactly and do not skip the checklist.

If answer mode is review:
- Use the student's proposal as the primary object of analysis.
- Use this exact response order:
    1. Verdict
    2. Correct parts
    3. Problems
    4. Missing requirements
    5. Corrected approach
    6. Next fixes
- Verdict must be one of: correct, partially correct, incorrect.
- Be strict and accurate.
- Explicitly compare against homework constraints from assignment sources.
- Flag unsupported assumptions and invented details.
- If code is present, explicitly call out invalid API usage, placeholders, undefined variables, TODO gaps, and non-runnable logic.
- State clearly whether the proposal is submission-ready.
- End with a short corrected takeaway and a highest-priority next-fix list.
- Keep tone professional, sharp, supportive, and tutor-like."""

    GENERAL_CHAT_PROMPT_TEMPLATE = """Student question: {query}

Answer mode: {answer_mode}
Code request: {code_request}

Respond as a dedicated tutor.

If answer mode is normal:
- Answer directly and naturally.
- Keep it concise, usually 2-4 short paragraphs.
- Avoid markdown headings and numbered section templates.
- Include a real-world example when it makes the idea easier.

If answer mode is homework:
- Guide the student step by step.
- Explain why each step is valid.
- Show formulas, substitutions, and checks when relevant.
- If the problem statement is incomplete, ask for the missing information.

If code request is yes:
- Return complete, runnable, working code.
- Include all imports, dependencies, and required files.
- Include exact commands to install/run.
- Provide quick validation steps so the student can verify it works.
- Avoid placeholders, TODOs, and pseudo-code.
- If the request is for a Python assignment, begin with the extracted rules checklist before any code.
- If the user asks for a full solution, provide complete worked steps and runnable code where applicable.

If answer mode is assignment:
- Use an energetic, practical build-guide style.
- Start by identifying the assignment goal in plain English.
- First extract the explicit requirements from the available prompt. If no prompt/material is available, ask the student to upload/paste it before giving a detailed solution.
- Explain the correct overall structure, deliverables, and test plan.
- Use markdown headings and bullets because this is a build plan, not a casual concept answer.
- For coding assignments, provide complete runnable code with comments by default.
- Provide exact setup/run/test commands and include all required output artifacts for submission.
- Do not use fake placeholder filenames/paths/schemas in final code.
- If assignment filenames are known from sources, reference those exact names.
- For Homework 12/MCP/Kaiko specifically, guide toward a FastMCP server exposing exchanges/instruments tools plus an agent that calls those tools. Mention requirements file, screenshot, and no API key in submitted files.
- For any other homework, adapt to that homework's actual prompt. Do not assume it is an MCP assignment, a PDF extraction assignment, or a finance calculation unless the prompt says so.
- If the student asks "is this correct?", give a verdict and then separate correct parts, missing parts, incorrect assumptions, and a revised plan.
- Do not make up course-specific details unless they were provided in the conversation or uploaded materials.
- Be detailed when needed; do not artificially keep assignment guidance short.

If answer mode is review:
- Start with a clear verdict.
- Compare the student's proposed answer against the actual prompt.
- Say exactly what is correct, what is missing, what is wrong, and what the corrected approach should be.
- If the uploaded prompt is unavailable, ask the student to upload/paste it before giving a definitive verdict.
- Use strict response order: Verdict, Correct parts, Problems, Missing requirements, Corrected approach, Next fixes.
- End with a short corrected takeaway and only highest-priority fixes.

If the question is unrelated to academics or learning, briefly redirect to tutoring support.
"""

    SUMMARY_PROMPT_TEMPLATE = """Please summarize the following course material concisely.

Material:
{content}

Provide:
1. A {length} summary with a strict maximum of {word_limit} words
2. Key takeaways (3-5 bullet points)
3. Important formulas or concepts to remember
4. Common misconceptions to avoid"""

    FLASHCARD_PROMPT_TEMPLATE = """Create {count} high-quality flashcards from this material for {level} level students.

Material:
{content}

Format: Return a JSON array of objects with "question" and "answer" keys.
Focus on:
- Key definitions and formulas
- Conceptual understanding appropriate for {level}
- Problem-solving approaches at {level} difficulty
- Real-world applications to FE524 topics"""

    QUIZ_PROMPT_TEMPLATE = """Generate {questions} quiz questions from this material for {level} level students.

Material:
{content}

Format: Return a JSON array with objects containing:
- "question": The question text
- "options": Array of 4 possible answers
- "correct_answer": Index of correct answer (0-3)
- "explanation": Why this is correct

Focus on:
- Core concepts understanding
- Application to financial scenarios matching {level} difficulty
- Quantitative problem-solving suitable for {level}
- Recognizing key relationships"""

rag_service = RAGService()
prompt_service = PromptService()
