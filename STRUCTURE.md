# 📚 Project Structure Guide

This guide explains what's in this pi extension starter and how to use it.

## File Organization

```
pi-ext-starter/
├── 📖 README.md                 ← Start here! Overview & features
├── ⚡ QUICKSTART.md              ← 5-minute getting started guide
├── 🤝 CONTRIBUTING.md            ← How to contribute
├── 📄 LICENSE                    ← MIT License
│
├── 📦 package.json               ← npm configuration
├── ⚙️ tsconfig.json               ← TypeScript configuration
├── .gitignore                   ← Git ignore rules
│
├── 📁 src/
│   └── index.ts                 ← Main entry point (placeholder)
│
├── 📁 examples/                  ← Working extension examples
│   ├── simple.ts                ← Minimal event listener
│   ├── tool.ts                  ← Register custom tools
│   ├── command.ts               ← Register custom commands
│   ├── complex.ts               ← Advanced features demo
│   ├── ui-interaction.ts        ← User prompts & notifications
│   ├── state-management.ts      ← Session state persistence
│   └── with-multiple-files/     ← Multi-file extension
│       ├── index.ts             ├─ Entry point
│       ├── tools.ts             ├─ Tool definitions
│       ├── handlers.ts          ├─ Event handlers
│       └── utils.ts             └─ Utilities & helpers
│
├── 📁 templates/                 ← Quick-start templates
│   ├── bare-minimum.ts          ← Absolute minimum
│   ├── typescript-strict.ts     ← Strict typing
│   └── with-dependencies.ts     ← With npm packages
│
└── 📁 docs/                      ← Comprehensive guides
    ├── events.md                ← All available events
    ├── tools.md                 ← Creating custom tools
    ├── commands.md              ← Creating custom commands
    └── publishing.md            ← How to publish
```

## Quick Navigation

### 🚀 Getting Started (5-10 min)
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Copy an example from `examples/`
3. Test with `pi -e ./your-extension.ts`

### 📚 Learning
- **First Extension**: Copy `examples/simple.ts` and modify
- **Custom Tools**: Copy `examples/tool.ts` and adapt
- **Custom Commands**: Copy `examples/command.ts` and extend
- **Advanced Features**: Study `examples/complex.ts`
- **User Interaction**: See `examples/ui-interaction.ts`
- **State Management**: See `examples/state-management.ts`

### 📖 Documentation
- **Event Reference**: [docs/events.md](./docs/events.md)
- **Tool Guide**: [docs/tools.md](./docs/tools.md)
- **Command Guide**: [docs/commands.md](./docs/commands.md)
- **Publishing**: [docs/publishing.md](./docs/publishing.md)

### 🔧 For Specific Needs

| I want to... | Start with... |
|-------------|--------------|
| Learn basics | `examples/simple.ts` |
| Create a tool | `examples/tool.ts` |
| Add a command | `examples/command.ts` |
| Advanced usage | `examples/complex.ts` |
| Custom UI | `examples/ui-interaction.ts` |
| Save data | `examples/state-management.ts` |
| Large project | `examples/with-multiple-files/` |
| Use TypeScript strictly | `templates/typescript-strict.ts` |
| Use npm packages | `templates/with-dependencies.ts` |
| Minimal setup | `templates/bare-minimum.ts` |

## Learning Path

### Beginner
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Copy `examples/simple.ts`
3. Add a command using `examples/command.ts`
4. Test: `pi -e ./my-extension.ts`

### Intermediate
1. Read [docs/tools.md](./docs/tools.md)
2. Create your first tool using `examples/tool.ts`
3. Read [docs/events.md](./docs/events.md)
4. Handle tool calls using `examples/complex.ts`

### Advanced
1. Read [docs/publishing.md](./docs/publishing.md)
2. Build a multi-file extension using `examples/with-multiple-files/`
3. Add npm dependencies
4. Publish to npm or GitHub

## Example Complexity Levels

### ⭐ Level 1 - Very Simple
- **File**: `templates/bare-minimum.ts`
- **Size**: ~15 lines
- **Learn**: Basic structure

### ⭐⭐ Level 2 - Simple
- **File**: `examples/simple.ts`
- **Size**: ~20 lines
- **Learn**: Event listening

### ⭐⭐ Level 3 - Tools
- **File**: `examples/tool.ts`
- **Size**: ~100 lines
- **Learn**: Tool registration, parameters

### ⭐⭐ Level 4 - Commands
- **File**: `examples/command.ts`
- **Size**: ~150 lines
- **Learn**: Commands, user interaction

### ⭐⭐⭐ Level 5 - Intermediate
- **File**: `examples/complex.ts`
- **Size**: ~200 lines
- **Learn**: Event handling, blocking, monitoring

### ⭐⭐⭐ Level 6 - Advanced
- **File**: `examples/ui-interaction.ts`
- **Size**: ~300 lines
- **Learn**: Full UI API

### ⭐⭐⭐⭐ Level 7 - State Management
- **File**: `examples/state-management.ts`
- **Size**: ~350 lines
- **Learn**: Session persistence, recovery

### ⭐⭐⭐⭐ Level 8 - Large Projects
- **Dir**: `examples/with-multiple-files/`
- **Size**: ~200 lines total
- **Learn**: Modular structure, organization

## Installation Methods

### Test Locally
```bash
pi -e ./src/index.ts
```

### Install to Global Extensions
```bash
cp src/index.ts ~/.pi/agent/extensions/my-extension.ts
pi /reload
```

### Publish to npm
```bash
npm publish
pi install npm:my-extension
```

### Share via GitHub
```bash
git push
git tag v1.0.0
git push origin v1.0.0
pi install github.com/username/my-extension@v1.0.0
```

## Documentation Files

### README.md
Main overview. Start here for:
- What extensions can do
- Quick start overview
- Common patterns
- Publishing info

### QUICKSTART.md
5-minute quick start. Use this for:
- First-time setup
- Choosing a starting point
- Common tasks
- Troubleshooting

### docs/events.md
Complete event reference. Use this when:
- You need to know all available events
- You're building an event-driven extension
- You need the full lifecycle diagram

### docs/tools.md
Tool creation guide. Use this when:
- Creating custom tools
- Setting up tool parameters
- Handling tool execution
- Streaming results

### docs/commands.md
Command creation guide. Use this when:
- Creating custom commands
- Handling user input
- Building interactive workflows
- Session control

### docs/publishing.md
Publishing guide. Use this when:
- Sharing your extension
- Publishing to npm
- Publishing to gallery
- Version management

## Common Code Patterns

All major patterns are covered in the examples:

| Pattern | Example |
|---------|---------|
| Listen to events | `simple.ts` |
| Register tool | `tool.ts` |
| Register command | `command.ts` |
| Block dangerous commands | `complex.ts` |
| Modify tool results | `complex.ts` |
| Track statistics | `complex.ts` |
| Show notifications | `ui-interaction.ts` |
| Ask for input | `ui-interaction.ts` |
| Show selections | `ui-interaction.ts` |
| Persist state | `state-management.ts` |
| Multi-file project | `with-multiple-files/` |

## Development Workflow

1. **Copy a template or example** as your starting point
2. **Edit it locally** in your editor
3. **Test with `pi -e ./file.ts`** to see changes
4. **Read relevant docs** (events.md, tools.md, etc.) as needed
5. **Check examples** for similar patterns
6. **Install globally** when ready: `cp ... ~/.pi/agent/extensions/`
7. **Publish** when complete: `npm publish` or push to GitHub

## Tips for Success

✅ **Do this:**
- Start with a small example
- Test frequently
- Read the docs for your use case
- Keep extensions focused
- Add comments explaining code

❌ **Don't do this:**
- Try to build everything at once
- Skip reading the event lifecycle
- Forget to handle errors
- Ignore tool parameter schemas
- Copy code you don't understand

## Next Steps

1. **Pick your level**: Start with an example matching your skill level
2. **Read relevant docs**: Check the guide for your use case
3. **Copy and modify**: Use templates/examples as starting points
4. **Test and iterate**: Use `pi -e` to quickly test changes
5. **Share**: Publish to npm or GitHub when ready

## Getting Help

- **API Questions**: Check `docs/events.md`, `docs/tools.md`, `docs/commands.md`
- **Code Examples**: Look in `examples/` and `templates/`
- **More Details**: Read [docs/publishing.md](./docs/publishing.md) for distribution
- **Official Docs**: https://pi.mariozechner.dev/docs/extensions

---

**Ready to get started? Read [QUICKSTART.md](./QUICKSTART.md)! 🚀**
