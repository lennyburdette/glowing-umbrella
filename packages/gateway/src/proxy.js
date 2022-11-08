import { fetch, Headers } from "undici";
import { Readable } from "stream";
import rawBody from "raw-body";

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {string} url
 */
export async function proxyRequest(req, res, url) {
  // copy headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      typeof value === "string"
        ? headers.set(key, value)
        : value.forEach((value) => headers.append(key, value));
    }
  }

  // copy body as raw UInt8Array
  const body = await rawBody(req);

  // send request
  const resp = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  res.status(resp.status);

  // copy response headers
  for (const [key, value] of resp.headers) {
    res.header(key, value);
  }

  // stream response body
  if (resp.body) Readable.fromWeb(resp.body).pipe(res);
}
