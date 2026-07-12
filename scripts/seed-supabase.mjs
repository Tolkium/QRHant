/**
 * Seed Supabase with the same demo hunt as the on-device mock (fixed QR codes,
 * artwork text, 5 locked cards). Requires the service role key — never commit it.
 *
 * Setup once:
 *   copy supabase/.env.example → supabase/.env
 *   paste SUPABASE_SERVICE_ROLE_KEY from Dashboard → Settings → API
 *
 * Run:
 *   npm run seed:supabase
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { argon2id } from 'hash-wasm';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

loadEnv(resolve(root, 'supabase/.env'));

const url = process.env.SUPABASE_URL ?? 'https://rvtltgrlsmapwonmwsbf.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy supabase/.env.example → supabase/.env and paste the secret key (sb_secret_…).',
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EVENT_NAME = 'Demo Festival 2026';
const TAG_BYTES = 16;
const KEY_BYTES = 32;

const DEFAULT_THEME = {
  primary: '#6d28d9',
  primaryInk: '#ffffff',
  accent: '#f59e0b',
  bg: '#f8f7fc',
  surface: '#ffffff',
  ink: '#17141f',
  eventName: 'Demo Festival 2026',
  logoText: 'Demo Hunt',
};

const DEFAULT_FLAGS = {
  visible: true,
  topN: 0,
  anonymize: 'none',
  showAvatars: true,
  frozen: false,
};

const DEFAULT_SETTINGS = {
  manualEntryEnabled: false,
  invalidCodeStrikes: 5,
  syncRequestsPerMinute: 30,
  minAppVersion: '0.1.0',
};

const DEFAULT_ARGON = { memory: 24 * 1024, iterations: 2, parallelism: 1 };

const FIXED_DEMO_CODES = [
  'K7F3QX', 'M2P9WA', 'X4T7BD', 'R8N2VE', 'Q5H8CF',
  'W1D6GJ', 'T9B4KM', 'A3V7NP', 'E6X2QR', 'G8S5TV',
  'J0W3XY', 'N7Z1AB', 'P4C9DE', 'V2F8GH', 'Y6J5KA',
  'B1M4NC', 'D5Q7PS', 'H3R6TW', 'S9V0XZ', 'Z8Y2BC',
];

const SEED_ARTS = [
  { title: 'The Rusty Whale', en: 'A whale welded from scrap metal collected across three festivals. Its ribs are old bicycle frames.', sk: 'Veľryba zvarená zo šrotu vyzbieraného na troch festivaloch. Jej rebrá sú staré rámy bicyklov.', cs: 'Velryba svařená ze šrotu posbíraného na třech festivalech. Její žebra jsou staré rámy kol.' },
  { title: 'Mirror Grove', en: 'Twelve mirrors hung between birch trees. At noon the grove doubles itself and nobody can find the path.', sk: 'Dvanásť zrkadiel zavesených medzi brezami. Na poludnie sa hájik zdvojnásobí a nikto nenájde cestu.', cs: 'Dvanáct zrcadel zavěšených mezi břízami. V poledne se hájek zdvojnásobí a nikdo nenajde cestu.' },
  { title: 'Bass Totem', en: "A wooden totem carved with chainsaws during last year's opening night. It hums when the main stage plays.", sk: 'Drevený totem vyrezaný motorovými pílami počas minuloročného otvorenia. Keď hrá hlavné pódium, bzučí.', cs: 'Dřevěný totem vyřezaný motorovými pilami během loňského zahájení. Když hraje hlavní pódium, bzučí.' },
  { title: 'Paper Sky', en: 'Five thousand paper planes folded by visitors, frozen mid-flight on invisible wires.', sk: 'Päťtisíc papierových lietadielok poskladaných návštevníkmi, zamrznutých v lete na neviditeľných drôtoch.', cs: 'Pět tisíc papírových vlaštovek složených návštěvníky, zamrzlých v letu na neviditelných drátech.' },
  { title: 'The Listening Wall', en: 'Press your ear against the wall and you hear recordings of the festival from ten years ago.', sk: 'Prilož ucho k stene a počuješ nahrávky festivalu spred desiatich rokov.', cs: 'Přilož ucho ke zdi a uslyšíš nahrávky festivalu před deseti lety.' },
  { title: 'Neon Roots', en: 'UV-painted tree roots that glow after sunset. The artist watered them with fluorescent paint for a month.', sk: 'Korene stromov natreté UV farbou, ktoré po západe slnka žiaria. Autor ich mesiac polieval fluorescenčnou farbou.', cs: 'Kořeny stromů natřené UV barvou, které po západu slunce září. Autor je měsíc zaléval fluorescenční barvou.' },
  { title: 'Sound Cocoon', en: 'A woven cocoon big enough for two people. Inside, the festival noise drops to a whisper.', sk: 'Utkaný kokón dosť veľký pre dvoch. Vnútri klesne festivalový hluk na šepot.', cs: 'Utkaný kokon dost velký pro dva. Uvnitř klesne festivalový hluk na šepot.' },
  { title: 'Ticket Phoenix', en: "A phoenix built from 30,000 torn entry tickets. It rises from a nest of last year's wristbands.", sk: 'Fénix postavený z 30 000 roztrhaných vstupeniek. Vstáva z hniezda minuloročných náramkov.', cs: 'Fénix postavený z 30 000 roztrhaných vstupenek. Vstává z hnízda loňských náramků.' },
  { title: 'Gravity Swing', en: 'A swing that hangs sideways from a leaning pole. Sitting in it feels wrong in exactly the right way.', sk: 'Hojdačka visiaca nabok z nakloneného stĺpa. Sedieť v nej je zle presne tým správnym spôsobom.', cs: 'Houpačka visící bokem z nakloněného sloupu. Sedět v ní je špatně přesně tím správným způsobem.' },
  { title: 'The Choir of Cans', en: 'Two hundred tin cans on strings. When the wind comes from the river, they sing in C minor.', sk: 'Dvesto plechoviek na šnúrkach. Keď fúka od rieky, spievajú v c mol.', cs: 'Dvě stě plechovek na provázcích. Když fouká od řeky, zpívají v c moll.' },
  { title: 'Pixel Meadow', en: 'A meadow replanted as a 64x64 pixel image of a sunrise. Best viewed from the ferris wheel.', sk: 'Lúka presadená ako 64x64 pixelový obraz východu slnka. Najlepší výhľad je z ruského kolesa.', cs: 'Louka přesázená jako 64x64 pixelový obraz východu slunce. Nejlepší výhled je z ruského kola.' },
  { title: 'Whispering Doors', en: 'Nine doors standing alone in a field. Each opens onto a different recorded secret.', sk: 'Deväť dverí stojacich osamote na poli. Každé sa otvárajú do iného nahraného tajomstva.', cs: 'Devět dveří stojících osaměle na poli. Každé se otevírají do jiného nahraného tajemství.' },
  { title: 'The Glass Drummer', en: 'A drummer sculpted from shattered bottle glass, caught mid-solo. Ten thousand green shards.', sk: 'Bubeník vytvorený z rozbitého fľaškového skla, zachytený uprostred sóla. Desaťtisíc zelených črepov.', cs: 'Bubeník vytvořený z rozbitého lahvového skla, zachycený uprostřed sóla. Deset tisíc zelených střepů.' },
  { title: 'Moss Cinema', en: 'An old cinema chair overgrown with living moss, facing a screen of stretched canvas that shows only sky.', sk: 'Staré kinosedadlo zarastené živým machom oproti plátnu, na ktorom je len obloha.', cs: 'Staré kinosedadlo zarostlé živým mechem naproti plátnu, na kterém je jen obloha.' },
  { title: 'The Inverted Fountain', en: 'Water appears to flow upward thanks to hidden pumps and strobe lights. Wet proof that eyes lie.', sk: 'Voda akoby tiekla nahor vďaka skrytým čerpadlám a stroboskopom. Mokrý dôkaz, že oči klamú.', cs: 'Voda jako by tekla nahoru díky skrytým čerpadlům a stroboskopům. Mokrý důkaz, že oči lžou.' },
  { title: 'Postcards to Nobody', en: 'A mailbox full of postcards visitors wrote to strangers. Take one, leave one.', sk: 'Schránka plná pohľadníc, ktoré návštevníci napísali neznámym. Jednu si vezmi, jednu nechaj.', cs: 'Schránka plná pohlednic, které návštěvníci napsali neznámým. Jednu si vezmi, jednu nech.' },
  { title: 'The Slow Disco', en: 'A mirror ball turning once per hour. Dancers move so slowly you only notice from photos.', sk: 'Disko guľa, ktorá sa otočí raz za hodinu. Tanečníci sa hýbu tak pomaly, že si to všimneš len z fotiek.', cs: 'Disko koule, která se otočí jednou za hodinu. Tanečníci se hýbou tak pomalu, že si toho všimneš jen z fotek.' },
  { title: 'Ember Field', en: 'Two hundred solar lamps buried in the ground glow like dying embers when night falls.', sk: 'Dvesto solárnych lámp zakopaných v zemi žiari po zotmení ako dohasínajúce uhlíky.', cs: 'Dvě stě solárních lamp zakopaných v zemi září po setmění jako dohasínající uhlíky.' },
  { title: 'The Borrowed Forest', en: 'Fifty potted trees on loan from the city nursery form a tiny forest that will vanish with the festival.', sk: 'Päťdesiat stromov v kvetináčoch požičaných z mestskej škôlky tvorí lesík, ktorý zmizne s festivalom.', cs: 'Padesát stromů v květináčích půjčených z městské školky tvoří lesík, který zmizí s festivalem.' },
  { title: 'Echo Bell', en: 'A two-meter bronze bell you may ring exactly once. Its echo is sampled live into the ambient stage.', sk: 'Dvojmetrový bronzový zvon, na ktorý smieš zazvoniť presne raz. Jeho ozvena sa live sampluje na ambient stage.', cs: 'Dvoumetrový bronzový zvon, na který smíš zazvonit přesně jednou. Jeho ozvěna se živě sampluje na ambient stage.' },
];

const FAKE_PLAYERS = [
  ['ZlatyJelen', 'fox', 14],
  ['NocnaSova', 'owl', 12],
  ['Bublinka', 'frog', 9],
  ['KapitanQR', 'cat', 7],
  ['LovecPokladov', 'wolf', 5],
  ['PandaExpres', 'panda', 3],
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function b64ToBytes(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function newArgonSalt() {
  return bytesToB64(randomBytes(16));
}

function demoArtImage(index) {
  const hues = [265, 20, 145, 200, 330, 45, 175, 285, 90, 230];
  const h = hues[index % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(${h},70%,55%)"/>
    <stop offset="1" stop-color="hsl(${(h + 60) % 360},70%,40%)"/>
  </linearGradient></defs>
  <rect width="360" height="480" fill="url(#g)"/>
  <circle cx="${80 + (index * 47) % 220}" cy="${90 + (index * 83) % 300}" r="70" fill="rgba(255,255,255,0.25)"/>
  <circle cx="${280 - (index * 31) % 200}" cy="${360 - (index * 59) % 220}" r="110" fill="rgba(0,0,0,0.15)"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function syntheticEmail(nickname) {
  return `${nickname.trim().toLowerCase()}@player.qrhunt.app`;
}

async function deriveAndEncrypt(plaintext, argonSalt, argonParams, content) {
  const raw = await argon2id({
    password: plaintext,
    salt: b64ToBytes(argonSalt),
    parallelism: argonParams.parallelism,
    iterations: argonParams.iterations,
    memorySize: argonParams.memory,
    hashLength: TAG_BYTES + KEY_BYTES,
    outputType: 'binary',
  });
  const tag = bytesToHex(raw.slice(0, TAG_BYTES));
  const key = await crypto.subtle.importKey(
    'raw',
    raw.slice(TAG_BYTES),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(content)),
  );
  return { tag, iv: bytesToB64(iv), ciphertext: bytesToB64(new Uint8Array(ct)) };
}

async function removeOldDemo() {
  const { data: old } = await admin.from('events').select('id').eq('name', DEMO_EVENT_NAME);
  if (!old?.length) return;
  for (const row of old) {
    await admin.from('finds').delete().eq('event_id', row.id);
    await admin.from('codes').delete().eq('event_id', row.id);
    await admin.from('anomalies').delete().eq('event_id', row.id);
    await admin.from('events').delete().eq('id', row.id);
  }
  console.log(`Removed ${old.length} previous "${DEMO_EVENT_NAME}" event(s).`);
}

async function ensureFakePlayer(nickname, avatar) {
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: syntheticEmail(nickname),
    password: 'demo123',
    email_confirm: true,
    user_metadata: { nickname, language: 'sk' },
  });
  if (error || !data.user) throw new Error(`createUser ${nickname}: ${error?.message}`);
  await admin.from('profiles').upsert({
    id: data.user.id,
    nickname,
    avatar,
    language: 'sk',
    role: 'player',
  });
  return data.user.id;
}

async function main() {
  console.log('Seeding Supabase demo data…');
  await removeOldDemo();

  await admin.from('events').update({ active: false }).eq('active', true);

  const now = Date.now();
  const argonSalt = newArgonSalt();
  const eventId = crypto.randomUUID();

  const { error: eventError } = await admin.from('events').insert({
    id: eventId,
    name: DEMO_EVENT_NAME,
    starts_at: new Date(now - 24 * 3600_000).toISOString(),
    ends_at: new Date(now + 48 * 3600_000).toISOString(),
    state: 'live',
    active: true,
    theme: DEFAULT_THEME,
    leaderboard_flags: DEFAULT_FLAGS,
    hunt_settings: DEFAULT_SETTINGS,
    maps: [],
    pack_version: 1,
    argon_salt: argonSalt,
    argon_params: DEFAULT_ARGON,
  });
  if (eventError) throw new Error(eventError.message);

  const codeRows = [];
  for (let i = 0; i < SEED_ARTS.length; i++) {
    const art = SEED_ARTS[i];
    const plaintext = FIXED_DEMO_CODES[i];
    const content = {
      title: art.title,
      art: { en: art.en, sk: art.sk, cs: art.cs },
      image: demoArtImage(i),
    };
    const { tag, iv, ciphertext } = await deriveAndEncrypt(
      plaintext,
      argonSalt,
      DEFAULT_ARGON,
      content,
    );
    codeRows.push({
      id: crypto.randomUUID(),
      event_id: eventId,
      code: plaintext,
      title: art.title,
      art: { en: art.en, sk: art.sk, cs: art.cs },
      image: demoArtImage(i),
      release_at: i >= 15 ? new Date(now + 12 * 3600_000).toISOString() : null,
      tag,
      iv,
      ciphertext,
    });
  }

  const { error: codesError } = await admin.from('codes').insert(codeRows);
  if (codesError) throw new Error(codesError.message);
  console.log(`Created event "${DEMO_EVENT_NAME}" with ${codeRows.length} codes.`);

  for (const [nickname, avatar, findCount] of FAKE_PLAYERS) {
    const userId = await ensureFakePlayer(nickname, avatar);
    for (let i = 0; i < findCount && i < codeRows.length; i++) {
      const t = new Date(now - (findCount - i) * 3600_000).toISOString();
      await admin.from('finds').upsert(
        {
          user_id: userId,
          code_id: codeRows[i].id,
          event_id: eventId,
          client_found_at: t,
          clamped_found_at: t,
          synced_at: t,
        },
        { onConflict: 'user_id,code_id' },
      );
    }
    console.log(`  ${nickname}: ${findCount} finds`);
  }

  console.log('\nDone. Fixed demo codes (same as mock):');
  console.log(FIXED_DEMO_CODES.slice(0, 5).join(', '), '…');
  console.log('Fake players password: demo123');
  console.log('Refresh the app (or clear pack cache) to load the new event.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
