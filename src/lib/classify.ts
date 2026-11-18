// Keyword heuristics for tagging items. Deliberately simple and transparent; replace
// with a model-based classifier behind the same functions if you need better recall.

import type { Topic, ToolCategory } from './types';

const AI_RE =
  /\b(ai|a\.i\.|agi|llms?|gpt(-?\d\w*)?|openai|anthropic|claude|gemini|deepmind|mistral|llama|grok|copilot|chatbot|chatgpt|machine learning|deep learning|neural|transformers?|diffusion|generative|hugging ?face|nvidia|inference|fine-?tun\w*|rag|embeddings?|agents?|agentic|language models?|foundation models?|robotics)\b/i;

export function isAboutAI(text: string): boolean {
  return AI_RE.test(text);
}

const TOPIC_RULES: [Topic, RegExp][] = [
  ['funding', /\b(rais(es|ed|ing)|funding|valuation|valued|series [a-f]\b|seed round|acqui(res?|red|sition)|ipo|invest(s|ed|ment|ors?)|\$\d[\d.,]*\s?(m|b|bn|million|billion)|merger|revenue)\b/i],
  ['policy', /\b(regulat\w+|law(s|suit|makers?)?|court|judge|senate|congress|parliament|ai act|copyright|ban(s|ned)?|executive order|policy|govern(ment|ance)|antitrust|privacy|safety institute|white house|commission|treaty|export controls?|legislation|ftc|sec)\b/i],
  ['research', /\b(paper|study|research(ers)?|benchmark|arxiv|dataset|interpretab\w+|theorem|proof|state[- ]of[- ]the[- ]art|sota|evaluation|scientists?|experiment)\b/i],
  ['models', /\b(models?|gpt-?\d\w*|claude|gemini|llama|mistral|grok|weights|open[- ]weights?|parameters|reasoning|multimodal|checkpoint|context window|tokens?|llms?)\b/i],
  ['products', /\b(launch(es|ed)?|app|apps|feature|rolls? out|rollout|now available|api|plugin|assistant|tool|update|pricing|enterprise|integration|subscription|browser|device|preview|beta)\b/i],
];

export function classifyTopics(text: string): Topic[] {
  return TOPIC_RULES.filter(([, re]) => re.test(text)).map(([topic]) => topic);
}

const CATEGORY_RULES: [ToolCategory, RegExp][] = [
  ['coding', /\b(code|coding|ide|editor|developer|debug|pull requests?|repo|terminal|cli|compiler|sql|programming|devtools?)\b/i],
  ['agents', /\b(agents?|agentic|autonomous|workflow automation|orchestrat\w+|mcp)\b/i],
  ['image', /\b(image|photo|picture|art|design|logo|illustration|diffusion|drawing)\b/i],
  ['video', /\b(video|animation|film|clip|avatar)\b/i],
  ['audio', /\b(audio|voice|speech|music|podcast|transcri\w+|tts|sound)\b/i],
  ['writing', /\b(writ(e|ing|er)|copy|essay|blog|grammar|email|translate|translation)\b/i],
  ['research', /\b(research|papers?|search engine|citations?|literature|knowledge base|notes)\b/i],
  ['productivity', /\b(productivity|calendar|meeting|spreadsheet|slides|docs|notes|inbox|tasks?|crm)\b/i],
  ['developer', /\b(api|sdk|framework|library|inference|gpu|vector|database|hosting|open[- ]source|self-hosted|local|runtime|llm)\b/i],
];

export function classifyTool(text: string): ToolCategory {
  return CATEGORY_RULES.find(([, re]) => re.test(text))?.[0] ?? 'developer';
}
