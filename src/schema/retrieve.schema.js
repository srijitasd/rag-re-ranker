import { Joi as joi } from "celebrate";

const retrieveSchema = {
  query: joi.object({
    q: joi.string().required(),
    strategy: joi.string().valid("bm25", "vector", "hybrid").required(),
    fusion: joi.string().valid("rrf", "weighted").required(),
    rerank: joi.boolean().required(),
    topK: joi.number().integer().min(1).max(100).default(10),
    preRerankK: joi.number().integer().min(1).max(100).default(50),
  }),
};

export { retrieveSchema };
