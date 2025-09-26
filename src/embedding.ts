import {
  env,
  FeatureExtractionPipeline,
  pipeline,
} from "@huggingface/transformers";
export type DType =
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


export interface IEmbeddingModel {
  modelname: string;
  dim: number;
  embedding: (text: string) => Promise<Float32Array>
}

/**
 * Fetch an open model hosted on HuggingFace and perform embedding locally.
 * Use the `init` function for initialization.
 */
export class HFLocalEmbeddingModel implements IEmbeddingModel {
  modelname: string;
  dim: number;
  dtype?: DType;
  embeddingPipeline?: FeatureExtractionPipeline;

  /**
   * !WARNING: This is intented for internal use. Use `init` static method instead.
   * @param modelname
   * @param dim
   * @param dtype
   */
  constructor(modelname: string, dim: number, dtype?: DType) {
    this.modelname = modelname;
    this.dim = dim;
    this.dtype = dtype;
  }

  /**
   * initializer of HFLocalEmbeddingModel
   * @param modelname Model name on HuggingFace
   * @param dim Dimension of embedding
   * @param dtype Quantization methods
   */
  public static async init(
    modelname: string,
    dim: number,
    dtype?: DType
  ): Promise<HFLocalEmbeddingModel> {
    const model = new HFLocalEmbeddingModel(modelname, dim, dtype);
    model.embeddingPipeline = await pipeline(
      "feature-extraction",
      model.modelname,
      { dtype: model.dtype }
    );
    return model;
  }

  /**
   * Function to calculate embeddings using the transformers pipeline
   * @param text
   * @returns
   */
  async embedding(text: string): Promise<Float32Array> {
    try {
      if (!this.embeddingPipeline) {
        throw new Error(
          "The `HFLocalEmbeddingModel` class must be initialized using the `init` function; do not call the constructor directly."
        );
      }
      const output = await this.embeddingPipeline(text, {
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
