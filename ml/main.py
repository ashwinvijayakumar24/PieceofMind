"""
FastAPI ML Service for Drug-Drug Interaction Detection
Supports multiple detection methods: static lookup, similarity matching, and OpenAI RAG
"""

import json
import os
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss

# Optional OpenAI integration
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO'))
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("Starting Drug-Drug Interaction ML Service...")
    load_drug_dataset()
    initialize_ml_models()
    logger.info("Service initialization complete")
    yield
    # Shutdown (if needed)
    logger.info("Service shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="Drug-Drug Interaction ML Service",
    description="AI-powered drug interaction detection service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class InteractionRequest(BaseModel):
    drugA: str = Field(..., description="First drug name")
    drugB: str = Field(..., description="Second drug name")

class InteractionResponse(BaseModel):
    severity: str = Field(..., description="Interaction severity: mild, moderate, severe")
    description: str = Field(..., description="Detailed description of the interaction")
    recommendation: str = Field(..., description="Clinical recommendation")
    sources: List[str] = Field(default=[], description="Evidence sources")
    confidence: float = Field(default=0.0, description="Confidence score (0-1)")
    method: str = Field(..., description="Detection method used")

class HealthResponse(BaseModel):
    status: str
    services: Dict[str, bool]
    model_loaded: bool

# Global variables for ML models and data
drug_data: Dict = {}
interaction_data: List[Dict] = []
sentence_model: Optional[SentenceTransformer] = None
faiss_index: Optional[faiss.IndexFlatIP] = None
drug_embeddings: Optional[np.ndarray] = None
drug_names: List[str] = []

def load_drug_dataset():
    """Load the static drug interaction dataset"""
    global drug_data, interaction_data

    dataset_path = Path(__file__).parent / "drug_interactions_dataset.json"
    try:
        with open(dataset_path, 'r') as f:
            data = json.load(f)
            drug_data = {drug['name'].lower(): drug for drug in data['drugs']}
            interaction_data = data['interactions']
            logger.info(f"Loaded {len(drug_data)} drugs and {len(interaction_data)} interactions")
    except Exception as e:
        logger.error(f"Error loading drug dataset: {e}")
        raise

def initialize_ml_models():
    """Initialize sentence transformer and FAISS index for similarity matching"""
    global sentence_model, faiss_index, drug_embeddings, drug_names

    try:
        # Load sentence transformer model
        model_name = os.getenv('MODEL_NAME', 'all-MiniLM-L6-v2')
        sentence_model = SentenceTransformer(model_name)
        logger.info(f"Loaded sentence transformer: {model_name}")

        # Create embeddings for all drugs
        drug_names = list(drug_data.keys())
        drug_descriptions = []

        for drug_name in drug_names:
            drug = drug_data[drug_name]
            # Combine relevant information for embedding
            description = f"{drug['name']} {drug['drug_class']} {drug['mechanism']} {drug['common_uses']} {drug['interactions_profile']}"
            drug_descriptions.append(description)

        # Generate embeddings
        drug_embeddings = sentence_model.encode(drug_descriptions, convert_to_tensor=False)

        # Create FAISS index
        dimension = drug_embeddings.shape[1]
        faiss_index = faiss.IndexFlatIP(dimension)

        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(drug_embeddings)
        faiss_index.add(drug_embeddings.astype('float32'))

        logger.info(f"Created FAISS index with {len(drug_names)} drug embeddings")

    except Exception as e:
        logger.error(f"Error initializing ML models: {e}")
        # Continue without ML capabilities

def find_static_interaction(drug_a: str, drug_b: str) -> Optional[Dict]:
    """Look for interaction in static dataset"""
    drug_a_norm = drug_a.lower().strip()
    drug_b_norm = drug_b.lower().strip()

    for interaction in interaction_data:
        interaction_a = interaction['drug_a'].lower()
        interaction_b = interaction['drug_b'].lower()

        if ((interaction_a == drug_a_norm and interaction_b == drug_b_norm) or
            (interaction_a == drug_b_norm and interaction_b == drug_a_norm)):
            return interaction

    return None

def calculate_similarity_score(drug_a: str, drug_b: str) -> Tuple[float, str]:
    """Calculate similarity between two drugs using embeddings"""
    if not sentence_model or not faiss_index:
        return 0.0, "ML models not available"

    try:
        drug_a_norm = drug_a.lower().strip()
        drug_b_norm = drug_b.lower().strip()

        # Find drug indices
        try:
            idx_a = drug_names.index(drug_a_norm)
            idx_b = drug_names.index(drug_b_norm)
        except ValueError:
            return 0.0, "One or both drugs not found in database"

        # Get similarity score using dot product (cosine similarity with normalized vectors)
        embedding_a = drug_embeddings[idx_a].reshape(1, -1)
        embedding_b = drug_embeddings[idx_b].reshape(1, -1)

        # Normalize
        faiss.normalize_L2(embedding_a)
        faiss.normalize_L2(embedding_b)

        similarity = np.dot(embedding_a, embedding_b.T)[0, 0]

        return float(similarity), "similarity_calculated"

    except Exception as e:
        logger.error(f"Error calculating similarity: {e}")
        return 0.0, f"Error: {str(e)}"

def generate_ai_explanation(drug_a: str, drug_b: str, similarity_score: float) -> Dict:
    """Generate AI-powered explanation using OpenAI (if available)"""
    if not OPENAI_AVAILABLE or not os.getenv('OPENAI_API_KEY'):
        return generate_rule_based_explanation(drug_a, drug_b, similarity_score)

    try:
        # Get drug information for context
        drug_a_info = drug_data.get(drug_a.lower(), {})
        drug_b_info = drug_data.get(drug_b.lower(), {})

        # Prepare context
        context = f"""
        Drug A: {drug_a}
        - Class: {drug_a_info.get('drug_class', 'Unknown')}
        - Mechanism: {drug_a_info.get('mechanism', 'Unknown')}
        - Interaction Profile: {drug_a_info.get('interactions_profile', 'Unknown')}

        Drug B: {drug_b}
        - Class: {drug_b_info.get('drug_class', 'Unknown')}
        - Mechanism: {drug_b_info.get('mechanism', 'Unknown')}
        - Interaction Profile: {drug_b_info.get('interactions_profile', 'Unknown')}

        Similarity Score: {similarity_score:.3f}
        """

        # Create OpenAI prompt
        prompt = f"""You are a clinical pharmacologist. Analyze the potential drug-drug interaction between {drug_a} and {drug_b}.

Context:
{context}

Provide a concise assessment including:
1. Interaction severity (mild/moderate/severe)
2. Brief mechanism explanation
3. Clinical recommendation

Respond in JSON format:
{{
    "severity": "mild|moderate|severe",
    "description": "brief description",
    "recommendation": "clinical recommendation"
}}"""

        # Call OpenAI API
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=300
        )

        # Parse response
        ai_response = json.loads(response.choices[0].message.content)
        return {
            'severity': ai_response.get('severity', 'mild'),
            'description': ai_response.get('description', 'AI-generated interaction assessment'),
            'recommendation': ai_response.get('recommendation', 'Monitor as appropriate'),
            'sources': ['OpenAI GPT-4 Analysis'],
            'confidence': min(0.8, similarity_score + 0.3),
            'method': 'ai_rag'
        }

    except Exception as e:
        logger.error(f"Error with OpenAI API: {e}")
        return generate_rule_based_explanation(drug_a, drug_b, similarity_score)

def generate_rule_based_explanation(drug_a: str, drug_b: str, similarity_score: float) -> Dict:
    """Generate explanation using rule-based logic"""
    drug_a_info = drug_data.get(drug_a.lower(), {})
    drug_b_info = drug_data.get(drug_b.lower(), {})

    # Simple rule-based severity assessment
    severity = "mild"
    description = f"Potential interaction between {drug_a} and {drug_b} based on drug class analysis."
    recommendation = "Monitor patients as clinically appropriate."

    # Check for high-risk drug classes
    high_risk_classes = ['anticoagulant', 'nsaid', 'ace inhibitor']
    drug_a_class = drug_a_info.get('drug_class', '').lower()
    drug_b_class = drug_b_info.get('drug_class', '').lower()

    if any(cls in drug_a_class for cls in high_risk_classes) and any(cls in drug_b_class for cls in high_risk_classes):
        severity = "moderate"
        description = f"Moderate interaction risk between {drug_a_class} and {drug_b_class}."
        recommendation = "Monitor closely for adverse effects and consider dose adjustments."

    # Special case for anticoagulant + NSAID
    if ('anticoagulant' in drug_a_class and 'nsaid' in drug_b_class) or \
       ('nsaid' in drug_a_class and 'anticoagulant' in drug_b_class):
        severity = "severe"
        description = "High bleeding risk when combining anticoagulants with NSAIDs."
        recommendation = "Avoid combination if possible. Use alternative pain management."

    return {
        'severity': severity,
        'description': description,
        'recommendation': recommendation,
        'sources': ['Rule-based analysis'],
        'confidence': max(0.3, similarity_score),
        'method': 'rule_based'
    }


# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        services={
            "openai": OPENAI_AVAILABLE and bool(os.getenv('OPENAI_API_KEY')),
            "sentence_transformers": sentence_model is not None,
            "faiss": faiss_index is not None
        },
        model_loaded=sentence_model is not None
    )

@app.post("/interactions/check", response_model=InteractionResponse)
async def check_interaction(request: InteractionRequest):
    """Main endpoint for checking drug interactions"""
    try:
        drug_a = request.drugA.strip()
        drug_b = request.drugB.strip()

        logger.info(f"Checking interaction: {drug_a} + {drug_b}")

        # Step 1: Check static interaction database
        static_interaction = find_static_interaction(drug_a, drug_b)
        if static_interaction:
            return InteractionResponse(
                severity=static_interaction['severity'],
                description=static_interaction['description'],
                recommendation=static_interaction['recommendation'],
                sources=static_interaction.get('references', ['Static Database']),
                confidence=0.95,
                method='static_lookup'
            )

        # Step 2: Calculate similarity and generate explanation
        similarity_score, similarity_status = calculate_similarity_score(drug_a, drug_b)

        # Step 3: Generate explanation (AI or rule-based)
        explanation = generate_ai_explanation(drug_a, drug_b, similarity_score)

        return InteractionResponse(**explanation)

    except Exception as e:
        logger.error(f"Error processing interaction check: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/drugs")
async def list_drugs():
    """List all available drugs in the database"""
    return {
        "drugs": [{"name": name, "info": drug} for name, drug in drug_data.items()],
        "count": len(drug_data)
    }

@app.get("/drugs/{drug_name}")
async def get_drug_info(drug_name: str):
    """Get detailed information about a specific drug"""
    drug_info = drug_data.get(drug_name.lower())
    if not drug_info:
        raise HTTPException(status_code=404, detail="Drug not found")
    return drug_info

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )