#!/usr/bin/env bun
/**
 * verify-cf-token.ts
 *
 * Run BEFORE starting the server to confirm your Cloudflare credentials
 * are valid and Workers AI is accessible on your account.
 *
 * Usage:
 *   cd server
 *   CLOUDFLARE_AI_TOKEN=your_token bun run verify-cf-token.ts
 *
 * Or with .env loaded:
 *   bun run --env-file=.env verify-cf-token.ts
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const TOKEN = process.env.CLOUDFLARE_AI_TOKEN ?? "";

if (!TOKEN) {
  console.error("\n  ERROR: CLOUDFLARE_AI_TOKEN is not set.");
  console.error("  Set it in server/.env or pass it as an environment variable.\n");
  process.exit(1);
}

if (!ACCOUNT_ID) {
  console.error("\n  ERROR: CLOUDFLARE_ACCOUNT_ID is not set.");
  console.error("  Find it at: Cloudflare Dashboard → Workers & Pages → Overview → Account ID\n");
  process.exit(1);
}

// ── Test 1: Verify token permissions via account validation ──────────────────

console.log("\n  ANE — Cloudflare Credentials Verification");
console.log("  ─────────────────────────────────────────");
console.log(`  Account ID : ${ACCOUNT_ID}`);
console.log(`  Token      : ${TOKEN.slice(0, 8)}${"*".repeat(Math.max(0, TOKEN.length - 8))}\n`);

async function verifyToken(): Promise<boolean> {
  console.log("  [1/3] Verifying token permissions...");
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { "Authorization": `Bearer ${TOKEN}` },
    });
    const data = await res.json() as { success: boolean; result: { status: string } };

    if (data.success && data.result.status === "active") {
      console.log("        ✓ Token is valid and active\n");
      return true;
    } else {
      console.error(`        ✗ Token status: ${data.result?.status ?? "unknown"}\n`);
      return false;
    }
  } catch (err) {
    console.error(`        ✗ Token verification failed: ${err}\n`);
    return false;
  }
}

// ── Test 2: Run a minimal inference call ─────────────────────────────────────

async function testInference(): Promise<boolean> {
  const model = "@cf/meta/llama-3.1-8b-instruct"; // Lightest model for the test
  console.log(`  [2/3] Testing inference with ${model}...`);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a test. Reply with exactly: VERIFIED" },
            { role: "user", content: "Reply with one word." },
          ],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );

    const data = await res.json() as {
      success: boolean;
      result?: { response?: string; choices?: { message: { content: string } }[] };
      errors?: { message: string }[];
    };

    if (!data.success) {
      const errMsg = data.errors?.map((e) => e.message).join(", ") ?? "unknown error";
      console.error(`        ✗ Inference failed: ${errMsg}\n`);
      return false;
    }

    const response =
      data.result?.response ??
      data.result?.choices?.[0]?.message?.content ??
      "(empty)";

    console.log(`        ✓ Inference successful`);
    console.log(`        ↳ Model response: "${response.trim().slice(0, 80)}"\n`);
    return true;
  } catch (err) {
    console.error(`        ✗ Inference call failed: ${err}\n`);
    return false;
  }
}

// ── Test 3: Confirm the primary ANE model is available ───────────────────────

async function testPrimaryModel(): Promise<boolean> {
  const model = process.env.CLOUDFLARE_AI_MODEL ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  console.log(`  [3/3] Testing primary ANE model (${model})...`);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Reply with exactly one word: READY" },
            { role: "user", content: "Status?" },
          ],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    const data = await res.json() as {
      success: boolean;
      result?: { response?: string; choices?: { message: { content: string } }[] };
      errors?: { message: string }[];
    };

    if (!data.success) {
      const errMsg = data.errors?.map((e) => e.message).join(", ") ?? "unknown error";
      console.error(`        ✗ Primary model unavailable: ${errMsg}`);
      console.error(`        ↳ The ANE server will fall back to llama-3.1-8b-instruct\n`);
      return false;
    }

    const response =
      data.result?.response ??
      data.result?.choices?.[0]?.message?.content ??
      "(empty)";

    console.log(`        ✓ Primary model accessible`);
    console.log(`        ↳ Response: "${response.trim().slice(0, 80)}"\n`);
    return true;
  } catch (err) {
    console.error(`        ✗ Primary model timed out: ${err}`);
    console.error(`        ↳ This may be normal — 70B models take longer to cold-start\n`);
    return false;
  }
}

// ── Run all checks ────────────────────────────────────────────────────────────

const tokenOk = await verifyToken();

if (!tokenOk) {
  console.error("  FATAL: Token is invalid. Cannot proceed.");
  console.error("  Create a new token at: dash.cloudflare.com → My Profile → API Tokens\n");
  process.exit(1);
}

const inferenceOk = await testInference();
const primaryOk = await testPrimaryModel();

console.log("  ─────────────────────────────────────────");
console.log(`  Token valid:          ${tokenOk ? "✓" : "✗"}`);
console.log(`  Inference working:    ${inferenceOk ? "✓" : "✗"}`);
console.log(`  Primary model ready:  ${primaryOk ? "✓" : "✗"}`);

if (tokenOk && inferenceOk) {
  console.log("\n  Cloudflare Workers AI is configured correctly.");
  console.log("  You can now start the ANE server: bun run dev\n");
  process.exit(0);
} else {
  console.error("\n  Setup incomplete. Fix the errors above before starting the server.\n");
  process.exit(1);
}
