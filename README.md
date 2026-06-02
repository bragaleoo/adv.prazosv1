# Adv.Prazos: Gerenciador de Prazos Processuais

Sistema focado em escritórios de advocacia e departamentos jurídicos para mitigar a perda de prazos de processos judiciais e organizar tarefas diárias.

## 🚀 Funcionalidades Principais

* **Visualização de Kanban e Agenda**: Acompanhamento dinâmico do vencimento e da criticidade de prazos.
* **Consulta Automatizada**: Scripts em Node (`query_prazos.ts`) que realizam queries ordenadas temporalmente no banco de dados para buscar prazos com status pendente de forma otimizada.
* **Saneamento e Sincronização de Usuários**: Scripts locais (`fix_user_ids.ts`, `check_users.ts`) para manter a consistência relacional dos IDs dos usuários integrados no banco.
* **Análise de Andamentos Jurídicos via IA**: Módulo embutido que analisa publicações oficiais do Diário de Justiça e sugere ações automáticas.

## 🛠️ Stack Tecnológica

* **Front-end**: React, TypeScript, Vite.
* **Mecanismos de IA**: Integração com Gemini SDK (`@google/genai`).
* **Banco de Dados**: Supabase (PostgreSQL).
* **Scripting**: Node.js, TypeScript, Dotenv.

## ⚙️ Configuração Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente baseando-se no arquivo `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Execute o projeto em desenvolvimento:
   ```bash
   npm run dev
   ```
