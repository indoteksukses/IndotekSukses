-- Indotek Sukses: AI / LLM Semantic Product & Variant Search Settings
-- Enables storing Base URL, Model name, API key, and search toggle in system_settings

begin;

alter table public.system_settings
  add column if not exists ai_base_url text default 'https://api.openai.com/v1',
  add column if not exists ai_api_key text,
  add column if not exists ai_model text default 'gpt-4o-mini',
  add column if not exists ai_search_enabled boolean default true;

comment on column public.system_settings.ai_base_url is 'Base URL for OpenAI-compatible LLM endpoint';
comment on column public.system_settings.ai_model is 'Model name (e.g. gpt-4o-mini, llama3.1, qwen2.5)';
comment on column public.system_settings.ai_api_key is 'API key for remote LLM providers (optional for local Ollama)';
comment on column public.system_settings.ai_search_enabled is 'Toggle switch for AI search in POS terminal';

commit;
