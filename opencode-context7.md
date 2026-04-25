### OpenCode Context7 docs snapshot (fetched via MCP)

This file contains a snapshot of the Context7 documentation retrieved for `/anomalyco/opencode` (topic: overview).

---

### Event System Architecture Overview

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/sync/README.md

Overview of the event system initialization and backwards compatibility mechanism. The system installs projectors and event hooks to handle dynamic event conversion while maintaining type safety through schema definitions.

```APIDOC
## Event System Initialization

### Description
The event system is initialized through server/projectors.js which calls SyncEvent.init to install projectors and configure event conversion hooks. This allows reshaping events from the sync system before publishing to the bus for backwards compatibility purposes.

### Key Components

#### SyncEvent.init
- Installs projectors for event handling
- Configures the sync event system
- Sets up event conversion pipeline

#### convertEvent Hook
- Dynamically converts events at runtime
- Reshapes event data before bus publication
- Used for temporary backwards compatibility measures
- Example: session.updated event conversion from partial to full session object

### Important Notes
- Event conversion should be avoided when possible
- Currently only used for session.updated event backwards compatibility
- Types must be correctly maintained during conversion
- Conversion logic is not automatically type-checked and must match busSchema definition
```

---

### Project Structure Overview

Source: https://github.com/anomalyco/opencode/blob/dev/packages/web/README.md

This illustrates the typical directory structure of an Astro + Starlight project. Key directories include `public/` for static assets, `src/content/docs/` for Markdown/MDX files, and configuration files like `astro.config.mjs`.

```tree
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

### Scoped Resource Management with Effect.acquireRelease

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/AGENTS.md

Use Effect.acquireRelease within the InstanceState.make closure for managing resources that require acquisition and release semantics. This is crucial for robust resource handling.

```typescript
Effect.acquireRelease;
```

---

### Set Agent Description in OpenCode JSON

Source: https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/agents.mdx

This JSON snippet shows how to specify a `description` for an OpenCode agent within the `opencode.json` file. The description provides a brief overview of the agent's purpose and is a required configuration option. It helps in understanding the agent's role at a glance.

```json
{
  "agent": {
    "review": {
      "description": "Reviews code for best practices and potential issues"
    }
  }
}
```

---

### Multi-field Data Schemas with Schema.Class

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/AGENTS.md

Employ Schema.Class for defining schemas for multi-field data structures. This provides a clear and structured way to represent complex data objects.

```typescript
Schema.Class;
```

---

### Define Data Object with Effect Schema.Class

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/specs/effect/schema.md

Use Schema.Class for structured data definitions. This example shows how to define an Info class with id, name, and enabled properties, exposing a Zod-compatible static property.

```ts
export class Info extends Schema.Class<Info>("Foo.Info")({
  id: FooID,
  name: Schema.String,
  enabled: Schema.Boolean,
}) {
  static readonly zod = zod(Info);
}
```

---

### Cards and Columns Examples

Source: https://github.com/anomalyco/opencode/blob/dev/packages/docs/ai-tools/cursor.mdx

Illustrates the use of Card and CardGroup components for emphasizing information, with options for column layouts.

```APIDOC
### Cards and columns for emphasizing information

Example of cards and card groups:

<Card title="Getting started guide" icon="rocket" href="/quickstart">
Complete walkthrough from installation to your first API call in under 10 minutes.
</Card>

<CardGroup cols={2}>
<Card title="Authentication" icon="key" href="/auth">
  Learn how to authenticate requests using API keys or JWT tokens.
</Card>

<Card title="Rate limiting" icon="clock" href="/rate-limits">
  Understand rate limits and best practices for high-volume usage.
</Card>
</CardGroup>
```

---

### Configurar opciones globales de modelos

Source: https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/es/models.mdx

Define opciones globales para modelos específicos de proveedores integrados. La configuración del agente anula estas opciones globales.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openai": {
      "models": {
        "gpt-5": {
          "options": {
            "reasoningEffort": "high",
            "textVerbosity": "low",
            "reasoningSummary": "auto",
            "include": ["reasoning.encrypted_content"],
          },
        },
      },
    },
    "anthropic": {
      "models": {
        "claude-sonnet-4-5-20250929": {
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 16000,
            },
          },
        },
      },
    },
  },
}
```

---

### Define Data Object with Effect Schema.Struct and withStatics

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/specs/effect/schema.md

When a class cannot reference itself cleanly during initialization, use Schema.Struct piped with withStatics to add derived properties like the Zod compatibility layer.

```ts
export const Info = Schema.Struct({
  id: FooID,
  name: Schema.String,
}).pipe(withStatics((s) => ({ zod: zod(s) })));
```

---

### Mintlify Step-by-Step Procedure Example

Source: https://github.com/anomalyco/opencode/blob/dev/packages/docs/ai-tools/cursor.mdx

Demonstrates structuring documentation into sequential steps, with options for including checks and warnings within each step. Useful for guiding users through complex processes.

````markdown
<Steps>
<Step title="Install dependencies">
  Run `npm install` to install required packages.
  
  <Check>
  Verify installation by running `npm list`.
  </Check>
</Step>

<Step title="Configure environment">
  Create a `.env` file with your API credentials.
  
  ```bash
  API_KEY=your_api_key_here
````

  <Warning>
  Never commit API keys to version control.
  </Warning>
</Step>
</Steps>
```

---

### List Available Models

Source: https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/cli.mdx

Displays all available models from configured providers in 'provider/model' format. Optionally filter by a specific provider ID or refresh the cache.

```bash
opencode models [provider]
```

```bash
opencode models anthropic
```

```bash
opencode models --refresh
```

---

### Provide feedback and context to OpenCode's plan

Source: https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/index.mdx

After OpenCode presents a plan, you can refine it by providing additional feedback or context. This example shows how to reference an external design (e.g., an image) to guide OpenCode's implementation of a new screen.

```txt
We'd like to design this new screen using a design I've used before.
[Image #1] Take a look at this image and use it as a reference.
```

---

### Update Component Example

Source: https://github.com/anomalyco/opencode/blob/dev/packages/docs/ai-tools/cursor.mdx

Demonstrates the Update component for displaying changelogs, including version labels, release dates, new features, and bug fixes.

```jsx
<Update label="Version 2.1.0" description="Released March 15, 2024">
  ## New features - Added bulk user import functionality - Improved error
  messages with actionable suggestions ## Bug fixes - Fixed pagination issue
  with large datasets - Resolved authentication timeout problems
</Update>
```

---

### Defining and Accessing Instance Context within Effect

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/specs/effect/instance-context.md

This snippet illustrates the target pattern for providing instance context using `InstanceScope.with` and subsequently accessing the context or specific properties like directory within an Effect fiber.

```typescript
InstanceScope.with({ directory, workspaceID }, effect);
```

```typescript
const ctx = yield * InstanceState.context;
```

```typescript
const dir = yield * InstanceState.directory;
```

---

### Perform Resource Cleanup in InstanceState Init

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/specs/effect/migration.md

Demonstrates using `Effect.acquireRelease` within the `InstanceState.make` init callback to manage resources that require explicit teardown, such as native watchers.

```typescript
yield *
  Effect.acquireRelease(
    Effect.sync(() => nativeAddon.watch(dir)),
    (watcher) => Effect.sync(() => watcher.close()),
  );
```

---

### Seleccionar modelo con comando CLI

Source: https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/es/models.mdx

Comando para listar y seleccionar modelos disponibles en OpenCode.

```bash
/models
```

---

### Background Consumers with Effect.forkScoped

Source: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/AGENTS.md

Utilize Effect.forkScoped within the InstanceState.make closure for background stream consumers. The fiber is automatically interrupted when the instance is disposed, preventing resource leaks.

```typescript
Effect.forkScoped;
```

---

(Truncated here in the workspace copy; full Context7 result also available in the session resources.)

---

_Saved to `c:/agency/opencode-context7.md`._
