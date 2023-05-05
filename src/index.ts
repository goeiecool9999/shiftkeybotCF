import { scrape_tweets } from "./scrapetwitter";


export interface Env {
	KNOWN_CODES: KVNamespace;

	BOT_TOKEN: string;
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		await scrape_tweets(env);
	},

	async fetch(request: Request, env: Env, context: ExecutionContext) {

		// await scrape_tweets(env);

		return new Response("Yeah we are here.");
	}
};

