export enum TemplateCategory {
  LLM_PROVIDER = 'LLM Provider',
  AI_FRAMEWORK = 'AI Framework',
  BASE = 'Base Template',
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  folderName: string;
  repositoryUrl: string;
  visible: boolean;
  icon?: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'base',
    name: 'Base Template',
    description:
      'Simple foundation template with no LLM or AI framework dependencies',
    category: TemplateCategory.BASE,
    folderName: '', // Root folder is the base template
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true,
    icon: '📦',
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    description:
      'Template configured for OpenAI GPT models with API integration',
    category: TemplateCategory.LLM_PROVIDER,
    folderName: 'openai-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🤖',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description:
      'Template configured for Anthropic Claude models with API integration',
    category: TemplateCategory.LLM_PROVIDER,
    folderName: 'anthropic-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🧠',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description:
      'Template for NVIDIA NIM (NVIDIA Inference Microservices) integration',
    category: TemplateCategory.LLM_PROVIDER,
    folderName: 'nvidia-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🔥',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Template for running local LLMs with Ollama',
    category: TemplateCategory.LLM_PROVIDER,
    folderName: 'ollama-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🦙',
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    description:
      'Multi-agent framework template for building collaborative AI agent crews',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'crewai-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '👥',
  },
  {
    id: 'agno',
    name: 'Agno',
    description:
      'Agno AI framework template for building sophisticated AI agents',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'agno-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true, // Ready for production!
    icon: '🧠',
  },
  {
    id: 'agno-team',
    name: 'Agno Team',
    description:
      'Agno AI Agents Team framework template for building sophisticated AI agents teams',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'agno-template-team',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true, // Ready for production!
    icon: '🧠',
  },
  {
    id: 'autogen',
    name: 'AutoGen',
    description:
      'Microsoft AutoGen framework template for conversational AI agents',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'autogen-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🔄',
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    description: 'Template for HuggingFace transformers and models integration',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'huggingface-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🤗',
  },
  {
    id: 'llamaindex',
    name: 'LlamaIndex',
    description:
      'Template for building RAG applications with LlamaIndex framework',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'llamaindex-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: false, // Draft - not ready yet
    icon: '🦙',
  },
  {
    id: 'strands-agents',
    name: 'Strands',
    description:
      'Strands framework template for building AI agents with tool support',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'strands-agents-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true,
    icon: '🧵',
  },
  {
    id: 'google-adk',
    name: 'Google ADK',
    description:
      'Google Agent Development Kit template with LiteLLM integration',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'google-adk-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true,
    icon: '🔧',
  },
  {
    id: 'open-ai-agents',
    name: 'OpenAI Agents SDK',
    description:
      'OpenAI Agents SDK template for building agents with OpenAI models',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'open-ai-agents-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true,
    icon: '🤖',
  },
  {
    id: 'langchain',
    name: 'LangChain',
    description:
      'LangChain framework template for building AI agents and chains',
    category: TemplateCategory.AI_FRAMEWORK,
    folderName: 'langchain-template',
    repositoryUrl: 'git@github.com:xpander-ai/custom-agents-assets.git',
    visible: true,
    icon: '🦜',
  },
];

/**
 * Get all visible templates
 */
export function getVisibleTemplates(): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((template) => template.visible);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: TemplateCategory,
): AgentTemplate[] {
  return AGENT_TEMPLATES.filter(
    (template) => template.category === category && template.visible,
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get all templates (including hidden ones) - for development use
 */
export function getAllTemplates(): AgentTemplate[] {
  return AGENT_TEMPLATES;
}
