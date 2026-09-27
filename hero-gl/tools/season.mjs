// local: node tools/season.mjs → JSON-ul sezonului (serve.py îl servește la /api/season)
import { getSeason } from '../api/_ewrc.mjs';
process.stdout.write(JSON.stringify(await getSeason()));
