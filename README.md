<div align="center">

# ⚽ Black King — MatchMind AI

**Plataforma de Inteligência Preditiva para Futebol com Explicabilidade por SHAP**

[![Java](https://img.shields.io/badge/Java_17+-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Python](https://img.shields.io/badge/Python_3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![SHAP](https://img.shields.io/badge/SHAP-Explainability-blueviolet?style=for-the-badge)](https://shap.readthedocs.io/)

*Ferramenta analítica e editorial de inteligência esportiva. Não facilita ou promove apostas.*

</div>

---

## 📌 Sobre o Projeto

**Black King (MatchMind AI)** é uma plataforma full-stack de análise preditiva para futebol, construída para demonstrar a integração real entre Engenharia de Software, Machine Learning e Visualização de Dados.

O sistema coleta partidas em tempo real via API oficial ([football-data.org](https://www.football-data.org/)), processa as features com modelos de ML em ensemble e retorna probabilidades calibradas para **9 mercados diferentes** por jogo — tudo com explicabilidade técnica via **SHAP values** e geração de texto contextual.

### Por que este projeto existe?

> A maioria das ferramentas de análise esportiva apresenta probabilidades sem explicar *por que* um modelo chegou àquela conclusão. Este projeto resolve isso com explicabilidade nativa: cada predição mostra quais variáveis mais influenciaram o resultado e em qual direção.

---

## 🧠 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FONTES DE DADOS                          │
│  football-data.org API v4  ──►  ESPN Scoreboard (fallback)      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ML PIPELINE (Python)                         │
│                                                                 │
│  football_data_collector.py ── Rate-limited API client          │
│           │                   (10 req/min, auto-retry)          │
│           ▼                                                     │
│  real_time_collector.py  ────── Feature Engineering             │
│           │                    + Form/xG via classificação real  │
│           ▼                                                     │
│  explain.py (ShapExplainer) ── Ensemble de 3 modelos:           │
│           │                   Random Forest + Logistic Reg.     │
│           │                   + Gradient Boosting               │
│           │                   ► SHAP values por feature          │
│           │                   ► Geração de texto em PT-BR        │
│           ▼                                                     │
│  predictions.json  ◄──────── Saída: 9 mercados por jogo         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Spring Boot / Java)                  │
│                                                                 │
│  REST API  ──►  H2 Database (in-memory)                         │
│  DatabaseInitializer → carrega predictions.json na inicialização│
│  MatchController  → POST /refresh dispara o Python              │
│  PredictionController → GET /predictions/match/{id}            │
│  PredictionListener → RabbitMQ consumer (opcional)             │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTP / REST
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                        │
│                                                                 │
│  Dashboard de partidas ── Cards por jogo com countdown          │
│  9 mercados por card   ── Barras de probabilidade + odds        │
│  SHAP Breakdown        ── Contribuição de cada feature          │
│  Calibration Page      ── Brier Score histórico por modelo      │
│  Match Detail Page     ── Análise profunda por partida          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Stack Tecnológica

### Backend — Java / Spring Boot
| Componente | Tecnologia | Função |
|---|---|---|
| Framework | Spring Boot 3 | REST API + Dependency Injection |
| ORM | Spring Data JPA + Hibernate | Persistência de dados |
| Banco de Dados | H2 (in-memory) | Armazenamento de partidas e predições |
| Mensageria | RabbitMQ (opcional) | Consumer assíncrono de predições |
| Inicialização | `DatabaseInitializer` (CommandLineRunner) | Carrega `predictions.json` na startup |

### ML Pipeline — Python
| Componente | Biblioteca | Função |
|---|---|---|
| Modelos Ensemble | `scikit-learn` | RandomForest + LogisticRegression + GradientBoosting |
| Explicabilidade | `shap` | SHAP TreeExplainer para feature importance |
| Engenharia de Dados | `pandas`, `numpy` | Feature engineering e simulação Poisson |
| API Client | `requests` | Rate-limited client para football-data.org |
| Coleta de Dados | `football_data_collector.py` | Fonte primária com retry automático |

### Frontend — Next.js
| Componente | Tecnologia | Função |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + Client Components |
| Estilização | Tailwind CSS | Design system responsivo |
| Visualização | CSS animations + progress bars | Barras de probabilidade interativas |
| Estado | React hooks (`useState`, `useEffect`, `useCallback`) | Gerenciamento de estado local |

### Integração Externa
| Serviço | Uso | Limite |
|---|---|---|
| [football-data.org](https://www.football-data.org/) | Partidas e classificações ao vivo | 10 req/min (Tier One) |
| ESPN Scoreboard API | Fallback para Copa do Mundo | Pública, sem auth |

---

## 🤖 Como os Modelos Funcionam

### Ensemble de 3 Algoritmos

Cada mercado é predito por **3 modelos independentes** cujas probabilidades são combinadas por **média aritmética** (consensus):

```python
prob_outcome = (prob_out_rf + prob_out_lr + prob_out_gb) / 3.0
```

| Modelo | Algoritmo | Vantagem |
|---|---|---|
| RF | `RandomForestClassifier` | Robusto a outliers, não-linear |
| LR | `LogisticRegression` (+ StandardScaler) | Calibrado, interpretável |
| GB | `GradientBoostingClassifier` | Captura relações complexas |

A variância entre os 3 modelos gera um score de **confiança** (`ALTA / MODERADA / BAIXA`) que é exibido na interface.

### Mercados Preditos (9 por jogo)

| Mercado | Tipo | Descrição |
|---|---|---|
| Resultado | Multiclasse (3) | Vitória Casa / Empate / Vitória Fora |
| BTTS | Binário | Ambas as equipes marcam |
| Over/Under 2.5 | Binário | Total de gols > 2.5 |
| Over 0.5 | Binário | Pelo menos 1 gol no jogo |
| Under 3.5 | Binário | Menos de 4 gols no jogo |
| Chance Dupla 1X | Derivado | Casa ou Empate |
| Chance Dupla 12 | Derivado | Casa ou Fora |
| Chance Dupla X2 | Derivado | Empate ou Fora |
| Over 9.5 Escanteios | Binário | Total de escanteios |
| Over 4.5 Cartões | Binário | Total de cartões |

### Features Utilizadas

```python
features = [
    "home_form",          # Win-rate normalizado (da classificação real)
    "away_form",          # Win-rate normalizado (da classificação real)
    "h2h_home_wins",      # Confrontos diretos históricos
    "home_injury_index",  # Índice de lesões do mandante
    "away_injury_index",  # Índice de lesões do visitante
    "rest_days_diff",     # Diferença de dias de descanso
    "xg_home_avg",        # Média de gols esperados (mandante) via classificação
    "xg_away_avg",        # Média de gols esperados (visitante) via classificação
]
```

### Simulação de Poisson para Treinamento

O dataset de treino é gerado sinteticamente via **distribuição de Poisson** (modelo estatístico padrão para gols em futebol):

```python
lam_home = exp(0.2 + 0.6 * home_form - 0.4 * injury_factor + 0.2 * xg_home)
home_goals = np.random.poisson(lam_home)
```

### Ajuste em Tempo Real (Partidas ao Vivo)

Durante partidas LIVE, as probabilidades são **recalculadas dinamicamente** com base no placar atual:

```python
# Ex: Mandante vencendo por 2+ gols
if diff >= 2:
    p_home_new = p_home + 0.85 * (1.0 - p_home)  # → ~99% de vitória
```

---

## 🏗️ Estrutura do Projeto

```
black-king/
├── backend/                          # Spring Boot (Java)
│   └── src/main/java/com/nowornever/
│       ├── BackendApplication.java
│       ├── config/
│       │   ├── DatabaseInitializer.java  # Seed de predições na startup
│       │   └── RabbitMQConfig.java       # Configuração de filas
│       ├── controller/
│       │   ├── MatchController.java      # GET/POST /api/matches
│       │   ├── PredictionController.java # GET /api/predictions/match/{id}
│       │   └── UserController.java       # GET /api/users
│       ├── dto/
│       │   └── PredictionMessageDto.java # Payload de predição
│       ├── model/
│       │   ├── Match.java               # Entidade de partida
│       │   ├── MatchPrediction.java     # Entidade com 9 mercados + SHAP
│       │   ├── Team.java                # Entidade de time
│       │   └── User.java                # Entidade de usuário
│       ├── repository/                  # Spring Data JPA Repositories
│       └── service/
│           └── PredictionListener.java  # RabbitMQ consumer (opcional)
│   └── src/main/resources/
│       ├── application.yml              # Config: DB, RabbitMQ, football-data API
│       └── predictions.json             # Predições geradas pelo Python
│
├── ml-pipeline/                         # Pipeline Python
│   ├── requirements.txt
│   └── src/
│       ├── football_data_collector.py   # ← NOVO: API oficial football-data.org
│       ├── real_time_collector.py       # Orquestrador principal + ESPN fallback
│       ├── explain.py                   # ShapExplainer + geração de texto
│       ├── collector.py                 # Geração de dados históricos (Poisson)
│       └── train.py                     # Treinamento dos 21 modelos
│
└── frontend/                            # Next.js 15 (App Router)
    └── src/
        ├── app/
        │   ├── page.js                  # Dashboard principal de partidas
        │   ├── match/[id]/page.js       # Detalhe de partida + SHAP breakdown
        │   ├── calibration/page.js      # Histórico de acurácia e Brier Score
        │   ├── pricing/page.js          # Página de planos
        │   └── layout.js               # Layout global
        └── components/
            └── Header.js               # Navegação global
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Java (JDK) | 17+ |
| Maven | 3.8+ (incluso no `mvnw`) |
| Python | 3.9+ |
| Node.js | 18+ |

> **Nota:** RabbitMQ e PostgreSQL são opcionais. Por padrão o sistema roda com H2 in-memory e sem filas.

---

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/black-king.git
cd black-king
```

---

### 2. ML Pipeline — Treinar os modelos

```bash
cd ml-pipeline

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Instalar dependências
pip install -r requirements.txt

# Treinar os 21 modelos (RF + LR + GB × 7 mercados)
# Salva em: ml-pipeline/data/model_artifacts.pkl
python src/train.py
```

---

### 3. Gerar predições com dados reais

> Necessita de chave gratuita em [football-data.org](https://www.football-data.org/client/register)

```bash
# Configurar a chave (ou editar football_data_collector.py diretamente)
export FOOTBALL_DATA_API_KEY="sua_chave_aqui"

# Gerar predições para os próximos jogos do Brasileirão (BSA)
# Saída: backend/src/main/resources/predictions.json
python src/real_time_collector.py --competition BSA

# Outras competições disponíveis:
# PL (Premier League) | CL (Champions League) | BL1 (Bundesliga)
# SA (Serie A) | PD (La Liga) | FL1 (Ligue 1)
python src/real_time_collector.py --competition PL --days-ahead 14
```

---

### 4. Backend — Spring Boot

```bash
cd backend
./mvnw spring-boot:run
# API disponível em: http://localhost:8080
```

**Endpoints principais:**

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/matches` | Lista todas as partidas |
| `GET` | `/api/matches/{id}` | Detalhe de uma partida |
| `POST` | `/api/matches/refresh` | Executa o Python e recarrega predições |
| `POST` | `/api/matches/refresh?competition=PL` | Refresh para outra liga |
| `GET` | `/api/predictions/match/{matchId}` | Predições completas de uma partida |

---

### 5. Frontend — Next.js

```bash
cd frontend
npm install
npm run dev
# Interface em: http://localhost:3000
```

---

## 📊 Fluxo Completo de Dados

```
football-data.org API
        │
        ▼
football_data_collector.py
  ├── fetch_matches("BSA")           → 202 jogos futuros
  ├── fetch_standings("BSA")         → Classificação real (form/xG/pts)
  └── build_team_form_from_standings → form = (wins + 0.5*draws) / played
        │
        ▼
real_time_collector.py
  ├── Filtra janela de 10 dias (evita processar 200+ jogos de uma vez)
  ├── build_features_from_standings  → 8 features por jogo
  └── ShapExplainer.explain_match()
        ├── 3 modelos × 7 mercados = 21 predições
        ├── SHAP TreeExplainer       → importância de cada feature
        ├── DuckDuckGo search        → contexto de lesões/notícias (opcional)
        └── Geração de texto PT-BR   → explanationsJson
        │
        ▼
predictions.json (backend/src/main/resources/)
        │
        ▼
Spring Boot DatabaseInitializer
  ├── Lê predictions.json na startup
  ├── Cria/atualiza Team, Match, MatchPrediction no H2
  └── Disponibiliza via REST API
        │
        ▼
Next.js Frontend
  ├── Carrega dados (fire-and-forget refresh para não bloquear a UI)
  ├── Exibe cards por partida com 9 mercados
  └── Detalhe: SHAP breakdown + odds implícitas
```

---

## ⚙️ Configurações Chave

### `backend/src/main/resources/application.yml`

```yaml
app:
  football-data:
    api-key: ${FOOTBALL_DATA_API_KEY:sua_chave_aqui}
    competition: BSA          # Competição padrão para o refresh
    # Opções: BSA | PL | BL1 | SA | PD | FL1 | PPL | DED | ELC | CL | CLI | WC | EC

  rabbitmq:
    enabled: false            # true para ativar o consumer assíncrono
```

### `ml-pipeline/src/real_time_collector.py`

```python
MAX_DAYS_AHEAD = 10  # Janela de coleta (dias à frente)
                     # Aumentar para incluir mais rodadas futuras
```

---

## 🔧 Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `FOOTBALL_DATA_API_KEY` | ✅ Sim | Chave da API football-data.org |
| `ANTHROPIC_API_KEY` | ❌ Opcional | Claude API para explicações avançadas em PT-BR |

---

## 🗺️ Roadmap

- [x] **MVP** — Brasileirão Série A com 3 mercados core (Resultado, BTTS, Over 2.5)
- [x] **Expansão de mercados** — 9 mercados por jogo (Chance Dupla, Escanteios, Cartões)
- [x] **Multi-liga** — Suporte a 13 competições via football-data.org
- [x] **Features reais** — Form e xG calculados da classificação oficial (não simulados)
- [x] **Rate limiting inteligente** — 10 req/min com retry automático em 429
- [x] **Explicabilidade** — SHAP values + texto contextual por partida
- [ ] **Série histórica** — Buscar temporadas passadas para treino com dados reais
- [ ] **Tempo real** — WebSocket para atualização ao vivo de placar/probabilidades
- [ ] **Backtesting formal** — Comparar calibração do modelo vs. odds de mercado
- [ ] **Deploy** — Docker Compose completo + CI/CD
- [ ] **App mobile** — React Native com notificações

---

## 📐 Decisões Técnicas

### Por que H2 em vez de PostgreSQL?
O banco H2 in-memory foi escolhido para simplificar o setup local (zero configuração de banco externo). A migração para PostgreSQL requer apenas trocar o driver e a URL em `application.yml`.

### Por que o refresh é fire-and-forget no frontend?
O script Python leva 1-3 minutos para buscar dados da API, calcular SHAP e gerar texto. Bloqueá-lo antes de renderizar a página causaria um "loading infinito". A solução é carregar a UI com os dados em cache e atualizar em background.

### Por que ensemble de 3 modelos?
Um único modelo de ML é propenso a overfitting. O ensemble reduz a variância e gera um score de confiança mensurável pela variação entre os 3 modelos — transformando a incerteza do modelo em informação útil para o usuário.

---

## 👨‍💻 Autor

Desenvolvido por **Adrian** como projeto de portfólio — demonstração de integração entre Backend Java, ML Pipeline Python e Frontend moderno com dados de futebol ao vivo.

---

<div align="center">

**[⭐ Se este projeto foi útil, deixe uma estrela!]**

*© 2026 — Ferramenta analítica e editorial. Não facilita ou promove apostas.*

</div>
