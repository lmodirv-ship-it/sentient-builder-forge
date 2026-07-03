// Nawat streaming agent — server route.
// Fast Gemini Flash + tool-calling that reaches every studio capability.
// The route streams UI-message chunks in a shape the client can parse token-by-token.

import { createFileRoute } from "@tanstack/react-router";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, DEFAULT_CHAT_MODEL } from "@/lib/ai-gateway.server";

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ).min(1),
  profile: z.string().optional().default(""), // learned user profile (short summary)
  lang: z.enum(["ar", "en"]).default("ar"),
});

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? e}`, { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const isAr = body.lang === "ar";

        const system = (isAr
          ? `أنت «نواة» — عقل فائق السرعة يصمم ويبني كل شيء: مواقع، فيديو، صور، شعارات، سِيَر، محتوى.
- ردود موجزة، سريعة، عملية.
- استخدم أدواتك بلا تردد حين يطلب المستخدم إنشاء شيء.
- عربية فصحى قصيرة، Markdown نظيف.
- تعلَّم من تفضيلات المستخدم أدناه واستعملها.
${body.profile ? `\n<ملف المستخدم>\n${body.profile}\n</ملف المستخدم>` : ""}`
          : `You are "Nawat" — an ultra-fast super-brain that designs and builds everything: sites, video, images, logos, CVs, content.
- Be concise, fast, action-first.
- Use tools without hesitation when the user asks to create something.
- Clean short Markdown.
- Learn from the user profile below and use it.
${body.profile ? `\n<user_profile>\n${body.profile}\n</user_profile>` : ""}`);

        try {
          const result = streamText({
            model: gateway(DEFAULT_CHAT_MODEL),
            system,
            messages: body.messages,
            stopWhen: stepCountIs(50),
            tools: {
              plan_task: tool({
                description: "Break a complex user request into short concrete steps before acting.",
                inputSchema: z.object({
                  steps: z.array(z.string()).describe("2-6 short steps"),
                }),
                execute: async ({ steps }) => ({ ok: true, steps }),
              }),
              suggest_design: tool({
                description: "Suggest a visual design direction (palette, fonts, mood) for the user's project.",
                inputSchema: z.object({
                  topic: z.string(),
                  palette: z.array(z.string()).describe("3-5 hex colors"),
                  fonts: z.object({ display: z.string(), body: z.string() }),
                  mood: z.string(),
                }),
                execute: async (input) => ({ ok: true, ...input }),
              }),
              request_studio_action: tool({
                description:
                  "Ask the client-side Studio to actually run a generation. Kind is one of: site, video, image, logo, cv. The prompt is the full brief.",
                inputSchema: z.object({
                  kind: z.enum(["site", "video", "image", "logo", "cv"]),
                  prompt: z.string().min(3),
                  title: z.string().optional(),
                }),
                execute: async (input) => ({ ok: true, dispatched: true, ...input }),
              }),
              remember: tool({
                description:
                  "Remember a durable fact about the user (preference, style, domain, project). Short 1-line facts only.",
                inputSchema: z.object({
                  fact: z.string().min(3).max(240),
                }),
                execute: async ({ fact }) => ({ ok: true, saved: fact }),
              }),
            },
          });

          return result.toTextStreamResponse({
            headers: { "Cache-Control": "no-cache, no-transform" },
          });
        } catch (e: any) {
          const msg = String(e?.message ?? e);
          const status = /402|credits?/i.test(msg) ? 402 : /429|rate/i.test(msg) ? 429 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
