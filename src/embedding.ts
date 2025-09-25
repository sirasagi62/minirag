import { env, pipeline } from "@huggingface/transformers";

type EmbeddingFunction = (txt: string) => Promise<Float32Array>;

type DType =
  | "auto"
  | "fp32"
  | "fp16"
  | "q8"
  | "int8"
  | "uint8"
  | "q4"
  | "bnb4"
  | "q4f16";
  
// Set environment variables for transformers.js
env.allowRemoteModels = true; // Allow fetching models from Hugging Face Hub if not found locally

// Initialize the embedding pipeline
const embeddingPipeline = await pipeline(
  "feature-extraction",
  "sirasagi62/granite-embedding-107m-multilingual-ONNX",
  { dtype: "q8" }
);

class HFLocalEmbeddingModel {
  modelname: string;
  dim: number;
  dtype?: DType;

  /**
   * constructor of HFLocalEmbeddingModel
   * @param modelname Model name on HuggingFace
   * @param dim Dimension of embedding
   * @param dtype Quantization methods
   */
  constructor(modelname: string, dim: number, dtype?: DType) {
    this.modelname = modelname;
    this.dim = dim;
    this.dtype = dtype;
  }

  /**
   * Function to calculate embeddings using the transformers pipeline
   * @param text 
   * @returns 
   */
  async embedding(text: string): Promise<Float32Array> {
    try {
      const output = await embeddingPipeline(text, {
        pooling: "mean",
        normalize: true,
      });
      const embeddingArray = output.data;
      if (embeddingArray) {
        // Ensure the output is a Float32Array and matches the expected dimension
        if (embeddingArray.length !== this.dim) {
          console.warn(
            `Embedding dimension mismatch: expected ${this.dim}, got ${embeddingArray.length}. Truncating or padding.`
          );
          // Basic handling: truncate or pad if necessary. A more robust solution might be needed.
          const truncatedOrPadded = new Float32Array(this.dim);
          const copyLength = Math.min(embeddingArray.length, this.dim);
          truncatedOrPadded.set(
            Float32Array.from(embeddingArray).slice(0, copyLength)
          );
          return truncatedOrPadded;
        }
        return Float32Array.from(embeddingArray);
      }
      console.warn("Unexpected output format from embedding pipeline:", output);
      return new Float32Array(this.dim); // Return empty embedding of correct dimension
    } catch (error) {
      console.error("Error calculating embedding:", error);
      return new Float32Array(this.dim); // Return empty embedding on error
    }
  }
}

