/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function auth(req, res) {
  if (req.header("authorization") === "42") {
    res.setHeader("authorization", "108");
    res.json({ ok: true });
  } else {
    res.statusCode = 401;
    res.json({ ok: false, error: "Invalid authentication" });
  }
}
