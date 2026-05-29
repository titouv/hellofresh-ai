import createClient, { Middleware } from "openapi-fetch";
import type { paths } from "./v1";

const baseUrl = process.env.HELLOFRESH_API_URL;
const token = process.env.HELLOFRESH_API_TOKEN;

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    request.headers.set("User-Agent", "hellofresh-ai");
    request.headers.set("Accept", "*/*");
    return request;
  },
};

export const apiClient = createClient<paths>({
  baseUrl,
});

apiClient.use(authMiddleware);
