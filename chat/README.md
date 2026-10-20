# The chat proxy

The public page cannot hold an API key, so this Worker holds it. The page sends the conversation and the page-state digest;
the Worker forces the system prompt and the tool list, checks the page's origin, rate-limits each visitor (20 rounds a minute),
caps the rounds per day for everyone together (400 by default), forwards to the Messages API and returns the content blocks.
The page runs the tools (lookups over its own data) and shows the trail under each answer, exactly as on the claude.ai copy.

## Deploy from GitHub (no local tooling)

1. Create a free Cloudflare account. In the dashboard make an API token with the "Edit Cloudflare Workers" template, and copy the
   account id from the Workers overview page.
2. Add two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (`ANTHROPIC_API_KEY` is already there).
3. Run the `chat` workflow from the Actions tab. It installs, creates the KV namespace, uploads the Anthropic key as a Worker
   secret, deploys, writes the endpoint to `site/chat_endpoint.txt` and re-runs the refresh so the page picks it up.

## Deploy by hand

    cd chat && npm install
    npx wrangler login
    npx wrangler kv namespace create CHAT_KV        # paste the id into wrangler.toml
    npx wrangler secret put ANTHROPIC_API_KEY
    npx wrangler deploy                              # prints https://paper-network-chat.<account>.workers.dev
    echo "https://paper-network-chat.<account>.workers.dev/v1/chat" > ../site/chat_endpoint.txt   # then commit; the refresh rebuilds the page

## Cost and limits

A round is one request to the model; a question that reads two lookups is three rounds. With the system prompt cached, a round
on Claude Opus 5.5 is a few cents, on Sonnet 5.5 under a cent, on Haiku 5.5 a fraction of that. 400 rounds a day on Opus is
at most about $10 a day and usually far less; set `CHAT_MODEL` and `DAILY_CAP` in `wrangler.toml`, and keep the monthly spend
limit in the Anthropic console as the backstop. `npm test` runs the gate tests with a stub model.
