// Curated directory of established AI tools. These are real products, listed in
// editorial order (the "Popular" view keeps this order; there are no invented
// popularity numbers). Pricing types are a hand-maintained snapshot and can drift:
// review this file periodically. Add a tool by appending a row.

import type { Pricing, Tool, ToolCategory } from '../types';

export const SEED_REVIEWED = '2026-11';

type Row = [name: string, tagline: string, category: ToolCategory, pricing: Pricing, url: string];

const ROWS: Row[] = [
  ['ChatGPT', 'General-purpose AI assistant from OpenAI.', 'assistants', 'freemium', 'https://chatgpt.com'],
  ['Claude', 'AI assistant from Anthropic for writing, analysis and code.', 'assistants', 'freemium', 'https://claude.ai'],
  ['Gemini', 'Google’s AI assistant, integrated with Google apps.', 'assistants', 'freemium', 'https://gemini.google.com'],
  ['Cursor', 'AI-first code editor built on VS Code.', 'coding', 'freemium', 'https://cursor.com'],
  ['GitHub Copilot', 'AI pair programmer inside your editor and GitHub.', 'coding', 'freemium', 'https://github.com/features/copilot'],
  ['Perplexity', 'Answer engine that searches the web and cites sources.', 'research', 'freemium', 'https://www.perplexity.ai'],
  ['Midjourney', 'Image generation known for its distinctive aesthetic.', 'image', 'paid', 'https://www.midjourney.com'],
  ['ElevenLabs', 'Realistic text-to-speech, voice cloning and dubbing.', 'audio', 'freemium', 'https://elevenlabs.io'],
  ['Runway', 'Generative video models and editing tools.', 'video', 'freemium', 'https://runwayml.com'],
  ['NotebookLM', 'Research notebook grounded in the sources you upload.', 'productivity', 'freemium', 'https://notebooklm.google.com'],
  ['Hugging Face', 'Hub for open models, datasets and demo apps.', 'developer', 'freemium', 'https://huggingface.co'],
  ['Ollama', 'Run open models locally with one command.', 'developer', 'free', 'https://ollama.com'],
  ['Claude Code', 'Agentic coding tool that works in your terminal.', 'coding', 'paid', 'https://www.anthropic.com/claude-code'],
  ['Windsurf', 'Agentic IDE for multi-file code changes.', 'coding', 'freemium', 'https://windsurf.com'],
  ['Replit', 'Browser IDE with an AI agent that builds and deploys apps.', 'coding', 'freemium', 'https://replit.com'],
  ['v0', 'Generate UI and full-stack apps from prompts, by Vercel.', 'coding', 'freemium', 'https://v0.dev'],
  ['Aider', 'Open-source AI pair programming in the terminal.', 'coding', 'free', 'https://aider.chat'],
  ['Continue', 'Open-source AI code assistant for VS Code and JetBrains.', 'coding', 'free', 'https://www.continue.dev'],
  ['Le Chat', 'Mistral’s AI assistant.', 'assistants', 'freemium', 'https://chat.mistral.ai'],
  ['Grammarly', 'Writing assistant for grammar, tone and rewrites.', 'writing', 'freemium', 'https://www.grammarly.com'],
  ['DeepL', 'Machine translation and writing refinement.', 'writing', 'freemium', 'https://www.deepl.com'],
  ['QuillBot', 'Paraphrasing and summarising tool.', 'writing', 'freemium', 'https://quillbot.com'],
  ['Jasper', 'Marketing copy platform for teams.', 'writing', 'paid', 'https://www.jasper.ai'],
  ['Adobe Firefly', 'Generative image tools built into Adobe’s apps.', 'image', 'freemium', 'https://firefly.adobe.com'],
  ['Ideogram', 'Image generation with strong text rendering.', 'image', 'freemium', 'https://ideogram.ai'],
  ['ComfyUI', 'Open-source node-based interface for diffusion models.', 'image', 'free', 'https://www.comfy.org'],
  ['Krea', 'Real-time image generation and enhancement.', 'image', 'freemium', 'https://www.krea.ai'],
  ['Pika', 'Text-to-video and image-to-video generation.', 'video', 'freemium', 'https://pika.art'],
  ['Luma Dream Machine', 'Video generation from text and images.', 'video', 'freemium', 'https://lumalabs.ai/dream-machine'],
  ['HeyGen', 'AI avatar videos and video translation.', 'video', 'freemium', 'https://www.heygen.com'],
  ['Descript', 'Edit audio and video by editing the transcript.', 'video', 'freemium', 'https://www.descript.com'],
  ['Suno', 'Generate full songs from a text prompt.', 'audio', 'freemium', 'https://suno.com'],
  ['Whisper', 'Open-source speech recognition model from OpenAI.', 'audio', 'free', 'https://github.com/openai/whisper'],
  ['Otter', 'Meeting transcription and notes.', 'audio', 'freemium', 'https://otter.ai'],
  ['LangChain', 'Open-source framework for building LLM applications and agents.', 'agents', 'free', 'https://www.langchain.com'],
  ['LlamaIndex', 'Open-source framework for connecting LLMs to your data.', 'agents', 'free', 'https://www.llamaindex.ai'],
  ['CrewAI', 'Framework for orchestrating teams of AI agents.', 'agents', 'freemium', 'https://www.crewai.com'],
  ['n8n', 'Workflow automation with AI agent nodes; self-hostable.', 'agents', 'freemium', 'https://n8n.io'],
  ['Zapier', 'No-code automation across apps, with AI steps and agents.', 'agents', 'freemium', 'https://zapier.com'],
  ['Notion', 'Docs and wikis with a built-in AI assistant.', 'productivity', 'freemium', 'https://www.notion.com'],
  ['Granola', 'AI notepad that enhances your meeting notes.', 'productivity', 'freemium', 'https://www.granola.ai'],
  ['Raycast', 'Launcher for Mac with built-in AI commands.', 'productivity', 'freemium', 'https://www.raycast.com'],
  ['Gamma', 'Generate presentations and documents from a prompt.', 'productivity', 'freemium', 'https://gamma.app'],
  ['Elicit', 'Research assistant for finding and summarising papers.', 'research', 'freemium', 'https://elicit.com'],
  ['Consensus', 'Search engine that answers from peer-reviewed research.', 'research', 'freemium', 'https://consensus.app'],
  ['Semantic Scholar', 'Free academic search with citation data.', 'research', 'free', 'https://www.semanticscholar.org'],
  ['LM Studio', 'Desktop app for running local models.', 'developer', 'free', 'https://lmstudio.ai'],
  ['OpenRouter', 'One API for many model providers; pay per use.', 'developer', 'paid', 'https://openrouter.ai'],
  ['Replicate', 'Run and deploy open models through an API.', 'developer', 'paid', 'https://replicate.com'],
  ['Weights & Biases', 'Experiment tracking and evaluation for ML teams.', 'developer', 'freemium', 'https://wandb.ai'],
];

export const SEED_TOOLS: Tool[] = ROWS.map(([name, tagline, category, pricing, url]) => ({
  id: 'tool-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  tagline,
  category,
  pricing,
  url,
  origin: 'curated',
}));
