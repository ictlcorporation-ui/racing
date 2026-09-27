// Vercel: GET /api/season → rezultatele sezonului (vezi _ewrc.mjs). Cache pe CDN 6 h, iar dacă eWRC nu răspunde, rămâne ultima variantă (până la 7 zile).
import { getSeason } from './_ewrc.mjs';
export default async function handler(req, res) {
  try {
    const data = await getSeason();
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=604800');
    res.status(200).json(data);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(e) });
  }
}
