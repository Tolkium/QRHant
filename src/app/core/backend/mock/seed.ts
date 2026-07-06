import {
  CardContent,
  CodeRecord,
  DEFAULT_ARGON,
  DEFAULT_FLAGS,
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  HuntEvent,
  Lang,
  Profile,
} from '../../models';
import { idbGet, idbPut } from '../../db/idb';
import { generateCode } from '../../crypto/codec';
import { deriveCode, encryptContent, newArgonSalt } from '../../crypto/pack-crypto';
import { MockServer } from './mock-server';

const SEED_VERSION = 9;
const SEED_KEY = 'seeded:version';

/** Deterministic SVG placeholder artwork — abstract shapes only, no text overlay. */
function demoArtImage(index: number): string {
  const hues = [265, 20, 145, 200, 330, 45, 175, 285, 90, 230];
  const h = hues[index % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${h},70%,55%)"/>
    <stop offset="1" stop-color="hsl(${(h + 60) % 360},70%,40%)"/>
  </linearGradient></defs>
  <rect width="640" height="420" fill="url(#g)"/>
  <circle cx="${80 + (index * 47) % 480}" cy="${90 + (index * 83) % 240}" r="70" fill="rgba(255,255,255,0.25)"/>
  <circle cx="${520 - (index * 31) % 400}" cy="${300 - (index * 59) % 180}" r="110" fill="rgba(0,0,0,0.15)"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Demo codes are FIXED so every device seeds identical data — you can print
 * the QR sheet on one machine and scan it with any phone. Real events created
 * in the admin panel still get random codes.
 */
const FIXED_DEMO_CODES = [
  'K7F3QX', 'M2P9WA', 'X4T7BD', 'R8N2VE', 'Q5H8CF',
  'W1D6GJ', 'T9B4KM', 'A3V7NP', 'E6X2QR', 'G8S5TV',
  'J0W3XY', 'N7Z1AB', 'P4C9DE', 'V2F8GH', 'Y6J5KA',
  'B1M4NC', 'D5Q7PS', 'H3R6TW', 'S9V0XZ', 'Z8Y2BC',
];

interface SeedArt {
  title: string;
  en: string;
  sk: string;
  cs: string;
}

const SEED_ARTS: SeedArt[] = [
  { title: 'The Rusty Whale', en: 'A whale welded from scrap metal collected across three festivals. Its ribs are old bicycle frames.', sk: 'Veľryba zvarená zo šrotu vyzbieraného na troch festivaloch. Jej rebrá sú staré rámy bicyklov.', cs: 'Velryba svařená ze šrotu posbíraného na třech festivalech. Její žebra jsou staré rámy kol.' },
  { title: 'Mirror Grove', en: 'Twelve mirrors hung between birch trees. At noon the grove doubles itself and nobody can find the path.', sk: 'Dvanásť zrkadiel zavesených medzi brezami. Na poludnie sa hájik zdvojnásobí a nikto nenájde cestu.', cs: 'Dvanáct zrcadel zavěšených mezi břízami. V poledne se hájek zdvojnásobí a nikdo nenajde cestu.' },
  { title: 'Bass Totem', en: 'A wooden totem carved with chainsaws during last year\'s opening night. It hums when the main stage plays.', sk: 'Drevený totem vyrezaný motorovými pílami počas minuloročného otvorenia. Keď hrá hlavné pódium, bzučí.', cs: 'Dřevěný totem vyřezaný motorovými pilami během loňského zahájení. Když hraje hlavní pódium, bzučí.' },
  { title: 'Paper Sky', en: 'Five thousand paper planes folded by visitors, frozen mid-flight on invisible wires.', sk: 'Päťtisíc papierových lietadielok poskladaných návštevníkmi, zamrznutých v lete na neviditeľných drôtoch.', cs: 'Pět tisíc papírových vlaštovek složených návštěvníky, zamrzlých v letu na neviditelných drátech.' },
  { title: 'The Listening Wall', en: 'Press your ear against the wall and you hear recordings of the festival from ten years ago.', sk: 'Prilož ucho k stene a počuješ nahrávky festivalu spred desiatich rokov.', cs: 'Přilož ucho ke zdi a uslyšíš nahrávky festivalu před deseti lety.' },
  { title: 'Neon Roots', en: 'UV-painted tree roots that glow after sunset. The artist watered them with fluorescent paint for a month.', sk: 'Korene stromov natreté UV farbou, ktoré po západe slnka žiaria. Autor ich mesiac polieval fluorescenčnou farbou.', cs: 'Kořeny stromů natřené UV barvou, které po západu slunce září. Autor je měsíc zaléval fluorescenční barvou.' },
  { title: 'Sound Cocoon', en: 'A woven cocoon big enough for two people. Inside, the festival noise drops to a whisper.', sk: 'Utkaný kokón dosť veľký pre dvoch. Vnútri klesne festivalový hluk na šepot.', cs: 'Utkaný kokon dost velký pro dva. Uvnitř klesne festivalový hluk na šepot.' },
  { title: 'Ticket Phoenix', en: 'A phoenix built from 30,000 torn entry tickets. It rises from a nest of last year\'s wristbands.', sk: 'Fénix postavený z 30 000 roztrhaných vstupeniek. Vstáva z hniezda minuloročných náramkov.', cs: 'Fénix postavený z 30 000 roztrhaných vstupenek. Vstává z hnízda loňských náramků.' },
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
  { title: 'Echo Bell', en: 'A two-meter bronze bell you may ring exactly once. Its echo is sampled live into the ambient stage.', sk: 'Dvojmetrový bronzový zvon, na ktorý smieš zazvoniť presne raz. Jeho ozvena sa live samluje na ambient stage.', cs: 'Dvoumetrový bronzový zvon, na který smíš zazvonit přesně jednou. Jeho ozvěna se živě sampluje na ambient stage.' },
];

function contentOf(a: SeedArt, index: number): CardContent {
  return {
    title: a.title,
    art: { en: a.en, sk: a.sk, cs: a.cs } as Record<Lang, string>,
    image: demoArtImage(index),
  };
}

/**
 * Idempotent one-time seeding of the mock "server". Serialized with a Web
 * Lock: seeding takes seconds (20 Argon2 runs) and a reload mid-seed must not
 * start a second interleaved run — that used to produce duplicate events.
 */
export async function seedIfNeeded(server: MockServer): Promise<void> {
  const version = await idbGet<number>('kv', SEED_KEY);
  if (version === SEED_VERSION) return;
  if (navigator.locks) {
    await navigator.locks.request('qrhunt-seed', () => doSeed(server));
  } else {
    await doSeed(server);
  }
}

async function doSeed(server: MockServer): Promise<void> {
  const version = await idbGet<number>('kv', SEED_KEY);
  if (version === SEED_VERSION) return;

  // Seed version changed (or first run): wipe demo game data, keep accounts.
  const { idbClear } = await import('../../db/idb');
  await idbClear('events');
  await idbClear('codes');
  await idbClear('finds');
  await idbClear('anomalies');
  await idbClear('localFinds');

  const now = Date.now();
  const eventId = crypto.randomUUID();
  const argonSalt = newArgonSalt();

  const event: HuntEvent = {
    id: eventId,
    name: 'Demo Festival 2026',
    startsAt: new Date(now - 24 * 3600_000).toISOString(),
    endsAt: new Date(now + 48 * 3600_000).toISOString(),
    state: 'live',
    active: true,
    theme: { ...DEFAULT_THEME, eventName: 'Demo Festival 2026', logoText: 'Demo Hunt' },
    leaderboardFlags: { ...DEFAULT_FLAGS },
    huntSettings: { ...DEFAULT_SETTINGS },
    maps: [],
    packVersion: 1,
    argonSalt,
    argonParams: { ...DEFAULT_ARGON },
  };
  await server.putEvent(event);

  // Codes: derive production-format crypto fields (this is the same code path
  // the admin bulk generator uses).
  const codeRecords: CodeRecord[] = [];
  for (let i = 0; i < SEED_ARTS.length; i++) {
    const art = SEED_ARTS[i];
    const plaintext = FIXED_DEMO_CODES[i] ?? generateCode();
    const { tag, key } = await deriveCode(plaintext, argonSalt, event.argonParams);
    const { iv, ciphertext } = await encryptContent(contentOf(art, i), key);
    const record: CodeRecord = {
      id: crypto.randomUUID(),
      eventId,
      code: plaintext,
      title: art.title,
      art: { en: art.en, sk: art.sk, cs: art.cs },
      image: demoArtImage(i),
      mapId: null,
      mapX: null,
      mapY: null,
      mapNote: null,
      releaseAt: i >= 15 ? new Date(now + 12 * 3600_000).toISOString() : null,
      createdAt: new Date().toISOString(),
      tag,
      iv,
      ciphertext,
    };
    await server.putCode(record);
    codeRecords.push(record);
  }

  // Admin account (nickname: admin / password: admin123) — may already exist
  // when re-seeding after a seed version bump.
  if (!(await server.findUserByNickname('admin'))) {
    const admin: Profile = {
      id: crypto.randomUUID(),
      nickname: 'admin',
      avatar: 'owl',
      language: 'en',
      role: 'admin',
      banned: false,
      createdAt: new Date().toISOString(),
    };
    await server.putUser(admin);
    await server.putPasswordHash(admin.id, await MockServer.hashPassword('admin123', admin.id));
  }

  // Fake players with plausible finds for a living leaderboard
  const fakes: [string, string, number][] = [
    ['ZlatyJelen', 'fox', 14],
    ['NocnaSova', 'owl', 12],
    ['Bublinka', 'frog', 9],
    ['KapitanQR', 'cat', 7],
    ['LovecPokladov', 'wolf', 5],
    ['PandaExpres', 'panda', 3],
  ];
  for (const [nickname, avatar, findCount] of fakes) {
    let user = await server.findUserByNickname(nickname);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        nickname,
        avatar,
        language: 'sk',
        role: 'player',
        banned: false,
        createdAt: new Date().toISOString(),
      };
      await server.putUser(user);
      await server.putPasswordHash(user.id, await MockServer.hashPassword('demo123', user.id));
    }
    for (let i = 0; i < findCount && i < codeRecords.length; i++) {
      const c = codeRecords[i];
      const t = new Date(now - (findCount - i) * 3600_000).toISOString();
      await idbPut('finds', `${user.id}:${c.id}`, {
        userId: user.id,
        codeId: c.id,
        eventId,
        clientFoundAt: t,
        clampedFoundAt: t,
        syncedAt: t,
      });
    }
  }

  await idbPut('kv', SEED_KEY, SEED_VERSION);
}
