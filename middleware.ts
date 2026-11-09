export const config = {
  matcher: "/product/:slug*",
};

const BOT_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "WhatsApp",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "Pinterestbot",
  "vkShare",
  "Viber",
];

const BOT_REGEX = new RegExp(BOT_USER_AGENTS.join("|"), "i");

export default function middleware(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const url = new URL(req.url);

  if (BOT_REGEX.test(ua)) {
    const slug = url.pathname.replace("/product/", "");
    const rewriteUrl = new URL(`/api/og?slug=${encodeURIComponent(slug)}`, url.origin);
    return fetch(rewriteUrl);
  }

  return undefined;
}
