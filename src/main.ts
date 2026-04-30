import { ButtonAction, ControllerIndex } from "isaac-typescript-definitions";
import {
  EventCounter,
  MainMenuType,
  ModCallbackRepentogon,
} from "isaac-typescript-definitions-repentogon";
import {
  ISCFeature,
  jsonDecode,
  jsonEncode,
  upgradeMod,
} from "isaacscript-common";

const modVanilla = RegisterMod("Stats Leaderboard", 1);
const ISC_FEATURES = [ISCFeature.RUN_IN_N_FRAMES] as const;
const mod = upgradeMod(modVanilla, ISC_FEATURES);

// Sprites
const leaderboard = Sprite();
leaderboard.Load("gfx/ui/leaderboard/leaderboardmenu.anm2", true);
leaderboard.Play("Appear", true);

const helper = Sprite();
helper.Load("gfx/ui/helper/helper.anm2", true);
helper.Play("Idle", true);
// End Sprites

// Leaderboard State
enum LeaderboardType {
  GLOBAL,
  FRIENDS,
  ME,
}
const LEADERBOARD_TYPES = [
  LeaderboardType.GLOBAL,
  LeaderboardType.FRIENDS,
  LeaderboardType.ME,
] as const;
type LeaderboardTypeValue = (typeof LEADERBOARD_TYPES)[number];
type UIState = "hidden" | "appearing" | "visible" | "disappearing" | "loading";
let leaderboardState: UIState = "hidden";
let CURRENT_LEADERBOARD: LeaderboardTypeValue = LeaderboardType.GLOBAL;
// End Leaderboard State

// Booleans
let SHOW_LEADERBOARD = false;
// End Booleans

// Fonts
const font = Font();
font.Load("font/teammeatfont12.fnt");
const title = Font();
title.Load("font/teammeatfont16.fnt");
// End Fonts

let previousMenu: MainMenuType | undefined;
let pos: Vector = Vector(0, 0);
type PlayerEntry = Record<string, string | number>;
let globalEntries: PlayerEntry[] = [];
let friendEntries: PlayerEntry[] = [];
let meEntries: PlayerEntry[] = [];
let currentStatIndex = 0;
let currentPage = 0;
const PAGE_SIZE = 10;
let totalPages = 0;
let activeTCP: SocketClient | undefined;
let downloadLine:
  | LuaMultiReturn<[data: string | undefined, errMsg: string]>
  | undefined;
let length = 0;
let totalReceived = 0;
let entries = "";
let socket: Socket | null = null;
const [ok, requiredSocket] = pcall(require, "socket");
if (ok) {
  socket = requiredSocket as Socket;
}

const Stats = [
  ["mom_kills", EventCounter.MOM_KILLS],
  ["rocks_destroyed", EventCounter.ROCKS_DESTROYED],
  ["tinted_rocks_destroyed", EventCounter.TINTED_ROCKS_DESTROYED],
  ["super_special_rocks_destroyed", EventCounter.SUPER_SPECIAL_ROCKS_DESTROYED],
  ["poop_destroyed", EventCounter.POOP_DESTROYED],
  ["pills_eaten", EventCounter.PILLS_EATEN],
  ["xiii_death_card_used", EventCounter.XIII_DEATH_CARD_USED],
  ["arcades_entered", EventCounter.ARCADES_ENTERED],
  ["deaths", EventCounter.DEATHS],
  ["isaac_kills", EventCounter.ISAAC_KILLS],
  ["shopkeeper_killed", EventCounter.SHOPKEEPER_KILLED],
  ["satan_kills", EventCounter.SATAN_KILLS],
  ["shell_games_played", EventCounter.SHELL_GAMES_PLAYED],
  ["angel_deals_taken", EventCounter.ANGEL_DEALS_TAKEN],
  ["devil_deals_taken", EventCounter.DEVIL_DEALS_TAKEN],
  ["blood_donation_machine_used", EventCounter.BLOOD_DONATION_MACHINE_USED],
  ["slot_machines_broken", EventCounter.SLOT_MACHINES_BROKEN],
  ["donation_machine_counter", EventCounter.DONATION_MACHINE_COUNTER],
  ["eden_tokens", EventCounter.EDEN_TOKENS],
  ["streak_counter", EventCounter.STREAK_COUNTER],
  ["best_streak", EventCounter.BEST_STREAK],
  ["blue_baby_kills", EventCounter.BLUE_BABY_KILLS],
  ["lamb_kills", EventCounter.LAMB_KILLS],
  ["mega_satan_kills", EventCounter.MEGA_SATAN_KILLS],
  ["boss_rushes_cleared", EventCounter.BOSS_RUSHES_CLEARED],
  ["negative_streak_counter", EventCounter.NEGATIVE_STREAK_COUNTER],
  [
    "greed_donation_machine_counter",
    EventCounter.GREED_DONATION_MACHINE_COUNTER,
  ],
  ["hush_kills", EventCounter.HUSH_KILLS],
  ["delirium_kills", EventCounter.DELIRIUM_KILLS],
  ["dailies_played", EventCounter.DAILIES_PLAYED],
  ["dailies_streak", EventCounter.DAILIES_STREAK],
  ["dailies_won", EventCounter.DAILIES_WON],
  ["rainbow_poop_destroyed", EventCounter.RAINBOW_POOP_DESTROYED],
  ["batteries_collected", EventCounter.BATTERIES_COLLECTED],
  ["cards_used", EventCounter.CARDS_USED],
  ["shop_items_bought", EventCounter.SHOP_ITEMS_BOUGHT],
  ["chests_opened_with_key", EventCounter.CHESTS_OPENED_WITH_KEY],
  ["secret_rooms_walls_opened", EventCounter.SECRET_ROOMS_WALLS_OPENED],
  ["beds_used", EventCounter.BEDS_USED],
  ["mother_kills", EventCounter.MOTHER_KILLS],
  ["beast_kills", EventCounter.BEAST_KILLS],
  ["baby_plum_kills", EventCounter.BABY_PLUM_KILLS],
  ["battery_bums_killed", EventCounter.BATTERY_BUMS_KILLED],
  [
    "battery_bum_collectible_payouts",
    EventCounter.BATTERY_BUM_COLLECTIBLE_PAYOUTS,
  ],
] as const;

export function main(): void {
  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    render,
  );
}

function render() {
  const currentMenu = MenuManager.GetActiveMenu();
  pos = MenuManager.GetViewPosition();
  if (currentMenu === MainMenuType.STATS) {
    if (!StatsMenu.IsSecretsMenuVisible()) {
      renderHelper();
    }
    renderLeaderboard();
    if (previousMenu !== MainMenuType.STATS) {
      uploadData();
    }
  } else {
    leaderboard.Play("Appear", true);
    leaderboardState = "hidden";
    SHOW_LEADERBOARD = false;
    CURRENT_LEADERBOARD = LeaderboardType.GLOBAL;
    globalEntries = [];
    friendEntries = [];
    meEntries = [];
    currentStatIndex = 0;
    currentPage = 0;
  }
  if (
    currentMenu === MainMenuType.GAME
    && Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)
  ) {
    findSteamID();
  }
  previousMenu = currentMenu;
}

function renderLeaderboard() {
  leaderboardInput();
  if (leaderboardState !== "hidden") {
    leaderboard.Update();
    leaderboard.Render(Vector(pos.X - 468.5, pos.Y + 1342.5));
  }
  if (SHOW_LEADERBOARD && leaderboardState === "hidden") {
    leaderboard.Play("Appear", true);
    leaderboardState = "appearing";
  }

  if (!SHOW_LEADERBOARD && leaderboardState === "visible") {
    leaderboard.Play("Disappear", true);
    leaderboardState = "disappearing";
  }

  if (leaderboardState === "appearing" && leaderboard.IsFinished("Appear")) {
    leaderboardState = "loading";
    leaderboard.Play("Loading", true);
    downloadData();
  }

  if (
    leaderboardState === "disappearing"
    && leaderboard.IsFinished("Disappear")
  ) {
    leaderboardState = "hidden";
  }

  if (leaderboardState === "loading") {
    parseData();
  }

  if (leaderboardState === "visible") {
    displayEntries();
  }
}

function leaderboardInput() {
  if (Input.IsActionTriggered(ButtonAction.MAP, ControllerIndex.KEYBOARD)) {
    SHOW_LEADERBOARD = !SHOW_LEADERBOARD;
  }
  if (Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)) {
    const index = LEADERBOARD_TYPES.indexOf(CURRENT_LEADERBOARD);

    CURRENT_LEADERBOARD =
      LEADERBOARD_TYPES[(index + 1) % LEADERBOARD_TYPES.length]
      ?? LEADERBOARD_TYPES[0];
    leaderboard.SetFrame("Idle", CURRENT_LEADERBOARD);
    currentPage = 0;
  }
  if (leaderboardState === "visible") {
    const left = Input.IsActionTriggered(
      ButtonAction.MENU_LEFT,
      ControllerIndex.KEYBOARD,
    );
    const right = Input.IsActionTriggered(
      ButtonAction.MENU_RIGHT,
      ControllerIndex.KEYBOARD,
    );
    const up = Input.IsActionTriggered(
      ButtonAction.MENU_UP,
      ControllerIndex.KEYBOARD,
    );
    const down = Input.IsActionTriggered(
      ButtonAction.MENU_DOWN,
      ControllerIndex.KEYBOARD,
    );

    if (left || right) {
      currentStatIndex =
        (currentStatIndex + (right ? 1 : -1) + Stats.length) % Stats.length;
      currentPage = 0;
    }
    if (up || down) {
      currentPage = (currentPage + (down ? 1 : -1) + totalPages) % totalPages;
    }
  }
}

function buildFriendEntries(statKey: string) {
  friendEntries = [];
  const data = mod.LoadData();
  const friendsList = (data.split(":")[3] ?? "")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .split(",")
    .map((id) => id.replaceAll('"', "").trim());
  const steamID = data.split(":")[0];
  if (steamID === undefined) {
    Isaac.DebugString("Failed to load user's Steam ID for friend leaderboard");
    return;
  }
  friendsList.push(steamID);
  for (const entry of friendsList) {
    const match = globalEntries.find((e) => e["steam_id"] === entry);
    if (match) {
      friendEntries.push(match);
    }
  }
  const sorted = [...friendEntries].toSorted((a, b) => {
    const aVal = typeof a[statKey] === "number" ? a[statKey] : 0;
    const bVal = typeof b[statKey] === "number" ? b[statKey] : 0;
    return bVal - aVal;
  });
  friendEntries = sorted;
}

let meStartIndex = 0;
function buildMeEntries(statKey: string) {
  const sorted = [...globalEntries].toSorted((a, b) => {
    const aVal = typeof a[statKey] === "number" ? a[statKey] : 0;
    const bVal = typeof b[statKey] === "number" ? b[statKey] : 0;
    return bVal - aVal;
  });

  const steamID = mod.LoadData().split(":")[0];
  const playerIndex = sorted.findIndex(
    (entry) => entry["steam_id"] === steamID,
  );

  if (playerIndex === -1) {
    meEntries = [];
    return;
  }

  let start = playerIndex - 4;

  if (start < 0) {
    start = 0;
  }

  if (start + PAGE_SIZE > sorted.length) {
    start = Math.max(0, sorted.length - PAGE_SIZE);
  }

  meEntries = sorted.slice(start, start + PAGE_SIZE);
  meStartIndex = start === 0 ? 1 : start;
}

function displayEntries() {
  let leaderboardEntries: PlayerEntry[] = [];
  const [statKey] = Stats[currentStatIndex] ?? [];
  if (statKey === undefined) {
    return;
  }
  switch (CURRENT_LEADERBOARD) {
    case LeaderboardType.GLOBAL: {
      // Global Leaderboard
      leaderboardEntries = globalEntries;
      break;
    }

    case LeaderboardType.FRIENDS: {
      // Friend Leaderboard
      buildFriendEntries(statKey);
      leaderboardEntries = friendEntries;
      break;
    }

    case LeaderboardType.ME: {
      // Me Leaderboard
      buildMeEntries(statKey);
      leaderboardEntries = meEntries;
      break;
    }
  }
  const leaderboardName = statKey.replaceAll("_", " ");
  const color = KColor(0.216, 0.168, 0.176, 1);
  const baseX = pos.X - 468.5;
  const baseY = pos.Y + 1342.5;

  const titleX = baseX + 150;
  let titleYoffset = 41;
  if (leaderboardName.split(" ").length > 2) {
    titleYoffset = 35;
  }
  const titleY = baseY + titleYoffset;
  const lines = splitTitle(leaderboardName);

  for (const [i, line] of lines.entries()) {
    title.DrawString(line, titleX, titleY + i * 10, color, 169, true);
  }

  const sorted = [...leaderboardEntries].toSorted((a, b) => {
    const aVal = typeof a[statKey] === "number" ? a[statKey] : 0;
    const bVal = typeof b[statKey] === "number" ? b[statKey] : 0;
    return bVal - aVal;
  });

  totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const startIndex = currentPage * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, sorted.length);

  const entryX = baseX + 110;
  const entryY = baseY + 77;
  const statColumnX = baseX + 356;

  for (let i = startIndex; i < endIndex; i++) {
    const entry = sorted[i];
    if (entry === undefined) {
      continue;
    }

    const rank =
      CURRENT_LEADERBOARD === LeaderboardType.ME ? meStartIndex + i : i + 1;
    const text = `${rank}. ${entry["steam_name"] as string}`;
    const yPos = entryY + (i - startIndex) * 14;
    font.DrawString(text, entryX, yPos, color, 0, false);

    const statStr = tostring(entry[statKey]);
    const statWidth = font.GetStringWidth(statStr);
    font.DrawString(statStr, statColumnX - statWidth, yPos, color, 0, false);
  }
}

function splitTitle(leaderboard_title: string): readonly string[] {
  const words = leaderboard_title.split(" ");

  if (words.length <= 2) {
    return [leaderboard_title]; // no wrap needed
  }

  return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
}

function renderHelper() {
  helper.Update();
  helper.Render(Vector(pos.X - 138.5, pos.Y + 1372.5));
}

function findSteamID() {
  const [cmd] = io.popen(
    // eslint-disable-next-line unicorn/prefer-string-raw
    'cmd /c "C:\\Windows\\System32\\reg.exe query HKCU\\Software\\Valve\\Steam /v SteamPath" 2>&1',
  );
  if (!cmd) {
    Isaac.DebugString("popen failed");
    return;
  }
  let path = String(cmd.read("a"));
  cmd.close();
  path = path
    // eslint-disable-next-line unicorn/prefer-string-raw
    .replace("HKEY_CURRENT_USER\\Software\\Valve\\Steam", "")
    .replace("SteamPath", "")
    .replace("REG_SZ", "")
    .replaceAll("/", "\\")
    .trim();
  // eslint-disable-next-line unicorn/prefer-string-raw
  path += "\\config\\loginusers.vdf";

  const [file, err, errCode] = io.open(path, "r");
  if (!file) {
    Isaac.DebugString(`Failed to open file: ${err} (code ${errCode})`);
    return;
  }
  const content = file.read("a");
  if (content === undefined) {
    Isaac.DebugString("No content available in loginusers.vdf");
    return;
  }
  file.close();

  let steamID = "";
  let steamName = "";

  for (const line of content.split("\n")) {
    if (line.toLowerCase().includes("personaname")) {
      const name = line.split('"')[3];
      if (name === undefined) {
        Isaac.DebugString("Failed to find Steam Name");
        return;
      }
      steamName = name;
    }
    if (steamID !== "" && steamName !== "") {
      break;
    }
    if (
      line.includes("7656119")
      && !line.toLowerCase().includes("accountname")
    ) {
      const id = line.split('"')[1];
      if (id === undefined) {
        Isaac.DebugString("Failed to find Steam ID");
        return;
      }
      steamID = id;
    }
  }
  if (socket === null) {
    Isaac.DebugString("Socket not available");
    return;
  }
  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, friendErr] = tcp.connect("100.30.25.239", 80);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${friendErr}`);
    return;
  }
  const request =
    `GET /friends?steam_id=${steamID} HTTP/1.1\r\n`
    + "Host: 100.30.25.239\r\n"
    + "Content-Type: application/json\r\n\r\n";
  const [sent, sendErr] = tcp.send(request);
  if (sent === undefined) {
    Isaac.DebugString(`Failed to send GET: ${sendErr}`);
    tcp.close();
    return;
  }

  const [response, responseErr] = tcp.receive("*a");
  if (response === undefined) {
    Isaac.DebugString(`Error: ${responseErr}`);
    return;
  }
  tcp.close();
  const lines = response.split("\n");
  const friendsList = lines.at(-1);
  mod.SaveData(`${steamID}:${steamName}:true:${friendsList}`);
}

function uploadData() {
  if (!mod.HasData()) {
    findSteamID();
  }
  const gameData = Isaac.GetPersistentGameData();
  const playerStats: Record<string, number> = {};
  for (const [event, counter] of Stats) {
    playerStats[event] =
      typeof gameData.GetEventCounter(counter) === "number"
        ? gameData.GetEventCounter(counter)
        : 0;
  }
  const steamID = mod.LoadData().split(":")[0];
  const steamName = mod.LoadData().split(":")[1];

  const payload = {
    steam_id: steamID,
    steam_name: steamName,
    ...playerStats,
  };
  const json = jsonEncode(payload);
  const request =
    "POST /submit HTTP/1.1\r\n"
    + "Host: 100.30.25.239\r\n"
    + "Content-Type: application/json\r\n"
    + `Content-Length: ${json.length}\r\n`
    + `\r\n${json}`;

  if (socket === null) {
    Isaac.DebugString("Socket not available");
    return;
  }
  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, err] = tcp.connect("100.30.25.239", 80);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${err}`);
    return;
  }

  const send = tcp.send(request);
  if (send[0] === undefined) {
    Isaac.DebugString(`Userdata failed to send: ${send[1]}`);
    return;
  }
  tcp.close();
}

function downloadData() {
  if (socket === null) {
    Isaac.DebugString("Socket not available");
    return;
  }
  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, err] = tcp.connect("100.30.25.239", 80);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${err}`);
    return;
  }

  const request =
    "GET /leaderboard HTTP/1.1\r\n"
    + "Host: 100.30.25.239\r\n"
    + "Connection: close\r\n"
    + "Content-Type: application/json\r\n\r\n";

  const [sent, sendErr] = tcp.send(request);
  if (sent === undefined) {
    Isaac.DebugString(`Failed to send GET: ${sendErr}`);
    tcp.close();
    return;
  }

  tcp.settimeout(0);
  activeTCP = tcp;
}

function parseData() {
  if (activeTCP === undefined) {
    Isaac.DebugString("No active TCP connection for leaderboard data");
    return;
  }
  if (length === 0) {
    downloadLine = activeTCP.receive("*l");

    if (
      downloadLine[0] !== undefined
      && downloadLine[0].includes("Content-Length:")
    ) {
      const int = downloadLine[0].split("Content-Length:")[1];
      if (int !== undefined) {
        length = Number.parseInt(int.trim(), 10);
      }
    }
  } else if (downloadLine === undefined || downloadLine[0] !== "") {
    downloadLine = activeTCP.receive("*l");
  } else {
    const CHUNK_SIZE = 65_536;
    const remaining = length - totalReceived;
    const toReceive = Math.min(CHUNK_SIZE, remaining);
    const data = activeTCP.receive(toReceive);

    if (data[0] !== undefined) {
      entries += data[0];
      totalReceived += data[0].length;

      if (totalReceived >= length) {
        const parsed = jsonDecode(entries);
        if (parsed !== undefined && Array.isArray(parsed)) {
          globalEntries = parsed as PlayerEntry[];

          leaderboardState = "visible";
          leaderboard.Play("Idle", true);
        } else {
          Isaac.DebugString("Failed to parse JSON");
          leaderboardState = "hidden";
        }
        activeTCP.close();
        activeTCP = undefined;
        downloadLine = undefined;
        length = 0;
        entries = "";
        totalReceived = 0;
      }
    }
  }
}
