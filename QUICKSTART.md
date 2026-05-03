# Quick Start Guide

## ⚡ Test the Hello World Sample FIRST (2 minutes)

Your extension starter comes with a working "Hello World" sample!

### Try It Now

```bash
# Test without installing
pi -e ./src/index.ts

# Or use the test script
bash test.sh
```

You'll see:
- 🎉 "Hello World!" notification
- ✨ "Sample ext installed!" message
- 📦 Extension status widget

Then try:
```bash
/hello
/hello Alice
/ping
```

Or ask the LLM: "Greet me with a hello world message"

👉 **See [HELLO_WORLD.md](./HELLO_WORLD.md) for details**

---

## Step 1: Choose Your Starting Point

Pick one based on what you want to build:

| Goal | Start With |
|------|-----------|
| Learn the basics | `examples/simple.ts` |
| Create a tool | `examples/tool.ts` |
| Add a command | `examples/command.ts` |
| Build something complex | `examples/complex.ts` |
| Handle user input | `examples/ui-interaction.ts` |
| Manage state | `examples/state-management.ts` |
| Large extension | `examples/with-multiple-files/index.ts` |

## Step 2: Copy Your Starting Point

```bash
# For a simple extension
cp examples/simple.ts ~/.pi/agent/extensions/my-extension.ts

# Or for a directory structure
mkdir -p ~/.pi/agent/extensions/my-extension
cp examples/with-multiple-files/* ~/.pi/agent/extensions/my-extension/
```

## Step 3: Modify It

Edit the file to add your functionality. Here's a minimal example:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || "World"}!`, "success");
    },
  });
}
```

## Step 4: Test It

```bash
# Option A: Test without installing
pi -e ~/.pi/agent/extensions/my-extension.ts

# Option B: Reload pi to auto-discover
pi /reload

# Then try your command
/hello Alice
```

## Step 5: Share It (Optional)

### Method 1: Local File
Just share the `.ts` file with others to copy to their extensions folder.

### Method 2: npm Package
```bash
# 1. Create package.json
npm init -y

# 2. Update it with:
{
  "name": "pi-extension-hello",
  "keywords": ["pi-package"],
  "pi": { "extensions": ["./src/index.ts"] }
}

# 3. Publish
npm publish

# 4. Others install with:
pi install npm:pi-extension-hello
```

### Method 3: GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
git tag v1.0.0
git push origin v1.0.0

# Others install with:
pi install github.com/yourname/pi-extension-hello
```

## Common Tasks

### Add a Custom Tool

```typescript
import { Type } from "@sinclair/typebox";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something useful",
  parameters: Type.Object({
    input: Type.String(),
  }),
  async execute(_toolCallId, params) {
    return {
      content: [{ type: "text", text: `Processed: ${params.input}` }],
      details: {},
    };
  },
});
```

### Listen to Events

```typescript
pi.on("session_start", async (_event, ctx) => {
  ctx.ui.notify("My extension loaded!", "info");
});

pi.on("tool_call", async (event, ctx) => {
  console.log(`Tool called: ${event.toolName}`);
});
```

### Block Dangerous Commands

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash" && event.input.command.includes("rm -rf")) {
    const ok = await ctx.ui.confirm("⚠️ Dangerous!", "Allow rm -rf?");
    if (!ok) return { block: true, reason: "User blocked it" };
  }
});
```

### Show User Input Dialog

```typescript
pi.registerCommand("ask", {
  description: "Ask for input",
  handler: async (_args, ctx) => {
    const name = await ctx.ui.input({
      title: "What's your name?",
      placeholder: "Enter your name...",
    });
    
    if (name) {
      ctx.ui.notify(`Hello, ${name}!`, "success");
    }
  },
});
```

## Debugging

### Check if Extension Loaded

```bash
/help  # Should list your commands
```

### View Logs

```bash
# Check browser console if using RPC mode
# Or check terminal output if using CLI
```

### Test in Isolation

```bash
# Test without auto-discovery
pi -e ./my-extension.ts
```

## Next Steps

1. **Read the docs**: Check `docs/` for detailed guides
2. **Explore examples**: Look at `examples/` for more patterns
3. **Join the community**: Share your extension in the pi gallery
4. **Get help**: Check pi docs at https://pi.mariozechner.dev/docs/extensions

## Tips

- ✅ Start simple, add complexity gradually
- ✅ Test frequently with `pi -e` before installing
- ✅ Use TypeScript for better IDE support
- ✅ Add comments explaining what your extension does
- ✅ Check existing examples for patterns
- ✅ Handle errors gracefully
- ✅ Use `ctx.ui` for user feedback

## Troubleshooting

**Extension not loading?**
- Check file is in `~/.pi/agent/extensions/` or `.pi/extensions/`
- Run `pi /reload`
- Check for syntax errors

**Tool not callable by LLM?**
- Add `promptSnippet` to tool definition
- Check system prompt lists your tool in "Available tools"

**State not persisting?**
- Store state in tool result `details`
- Reconstruct from session on `session_start`

## Resources

- **Full API Reference**: See `docs/events.md`, `docs/tools.md`, `docs/commands.md`
- **Official Docs**: https://pi.mariozechner.dev/docs/extensions
- **Examples**: `examples/` directory
- **Community**: Share your extension in the pi gallery!

---

Happy extending! 🚀
