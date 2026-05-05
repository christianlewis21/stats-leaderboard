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
const ISC_FEATURES = [
  ISCFeature.RUN_IN_N_FRAMES,
  ISCFeature.SAVE_DATA_MANAGER,
] as const;
const mod = upgradeMod(modVanilla, ISC_FEATURES);
const v = {
  persistent: {
    steamID: "",
    steamName: "",
    friendsList: "",
  },
};
mod.saveDataManager("leaderboard", v);
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
let SHOW_LEADERBOARD = false;
type PlayerEntry = Record<string, string | number>;
let globalEntries: PlayerEntry[] = [];
let friendEntries: PlayerEntry[] = [];
let meEntries: PlayerEntry[] = [];
let currentStatIndex = 0;
let currentPage = 0;
const PAGE_SIZE = 10;
let totalPages = 0;
// End Leaderboard State

// Fonts
const font = Font();
font.Load("font/teammeatfont12.fnt");
const title = Font();
title.Load("font/teammeatfont16.fnt");
// End Fonts

// Socket
let socket: Socket | null = null;
const [ok, requiredSocket] = pcall(require, "socket");
if (ok) {
  socket = requiredSocket as Socket;
}
let activeTCP: SocketClient | undefined;
let downloadLine:
  | LuaMultiReturn<[data: string | undefined, errMsg: string]>
  | undefined;
let receivedLength = 0;
let totalReceived = 0;
let entries = "";
const SERVER_HOST = "100.30.25.239";
const SERVER_PORT = 80;
// End Socket

let previousMenu: MainMenuType | undefined;
let pos: Vector = Vector(0, 0);
const allIndices = [
  ControllerIndex.KEYBOARD,
  ControllerIndex.CONTROLLER_1,
  ControllerIndex.CONTROLLER_2,
  ControllerIndex.CONTROLLER_3,
];

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
  mod.saveDataManagerLoad();
  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    render,
  );
}

function render() {
  const currentMenu = MenuManager.GetActiveMenu();
  pos = MenuManager.GetViewPosition();
  updateLastUsedInputDevice();
  if (currentMenu === MainMenuType.STATS) {
    if (!StatsMenu.IsSecretsMenuVisible()) {
      renderHelper();
    }
    renderLeaderboard();
    if (previousMenu !== MainMenuType.STATS) {
      uploadData();
    }
  } else {
    resetDefault();
  }

  const isAnyActionTriggered = (action: ButtonAction): boolean =>
    allIndices.some((idx) => Input.IsActionTriggered(action, idx));
  if (
    currentMenu === MainMenuType.GAME
    && isAnyActionTriggered(ButtonAction.BOMB)
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
    requestDownload();
  }

  if (
    leaderboardState === "disappearing"
    && leaderboard.IsFinished("Disappear")
  ) {
    leaderboardState = "hidden";
  }

  if (leaderboardState === "loading") {
    downloadData();
  }

  if (leaderboardState === "visible") {
    displayEntries();
  }
}

let lastUsedInputDevice: "keyboard" | "controller" = "keyboard";
function leaderboardInput() {
  const isAnyActionTriggered = (action: ButtonAction): boolean =>
    allIndices.some((idx) => Input.IsActionTriggered(action, idx));

  if (isAnyActionTriggered(ButtonAction.MAP)) {
    SHOW_LEADERBOARD = !SHOW_LEADERBOARD;
  }

  if (isAnyActionTriggered(ButtonAction.BOMB)) {
    const index = LEADERBOARD_TYPES.indexOf(CURRENT_LEADERBOARD);

    CURRENT_LEADERBOARD =
      LEADERBOARD_TYPES[(index + 1) % LEADERBOARD_TYPES.length]
      ?? LEADERBOARD_TYPES[0];
    leaderboard.SetFrame("Idle", CURRENT_LEADERBOARD);
    currentPage = 0;
  }

  if (leaderboardState === "visible") {
    const left = isAnyActionTriggered(ButtonAction.MENU_LEFT);
    const right = isAnyActionTriggered(ButtonAction.MENU_RIGHT);
    const up = isAnyActionTriggered(ButtonAction.MENU_UP);
    const down = isAnyActionTriggered(ButtonAction.MENU_DOWN);

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

function updateLastUsedInputDevice() {
  const controllerIndices: ControllerIndex[] = [
    ControllerIndex.CONTROLLER_1,
    ControllerIndex.CONTROLLER_2,
    ControllerIndex.CONTROLLER_3,
  ];

  if (
    Input.IsActionPressed(ButtonAction.MENU_UP, ControllerIndex.KEYBOARD)
    || Input.IsActionPressed(ButtonAction.MENU_DOWN, ControllerIndex.KEYBOARD)
    || Input.IsActionPressed(ButtonAction.MENU_LEFT, ControllerIndex.KEYBOARD)
    || Input.IsActionPressed(ButtonAction.MENU_RIGHT, ControllerIndex.KEYBOARD)
    || Input.IsActionPressed(ButtonAction.MAP, ControllerIndex.KEYBOARD)
    || Input.IsActionPressed(
      ButtonAction.MENU_CONFIRM,
      ControllerIndex.KEYBOARD,
    )
  ) {
    lastUsedInputDevice = "keyboard";
    return;
  }

  for (const idx of controllerIndices) {
    if (
      Input.IsActionPressed(ButtonAction.MENU_UP, idx)
      || Input.IsActionPressed(ButtonAction.MENU_DOWN, idx)
      || Input.IsActionPressed(ButtonAction.MENU_LEFT, idx)
      || Input.IsActionPressed(ButtonAction.MENU_RIGHT, idx)
      || Input.IsActionPressed(ButtonAction.MAP, idx)
      || Input.IsActionPressed(ButtonAction.MENU_CONFIRM, idx)
    ) {
      lastUsedInputDevice = "controller";
      return;
    }
  }
}

function buildFriendEntries(statKey: string) {
  friendEntries = [];

  const { steamID, friendsList } = v.persistent;
  const decoded = jsonDecode(friendsList);
  const parsedFriends =
    decoded !== undefined && Array.isArray(decoded)
      ? (decoded as string[])
      : [];
  parsedFriends.push(steamID);

  const friendsSet = new Set(parsedFriends);

  const matches = globalEntries.filter((entry) =>
    friendsSet.has(entry["steam_id"] as string),
  );

  friendEntries = sortLeaderboard(matches, statKey) as PlayerEntry[];
}

let meStartIndex = 0;
function buildMeEntries(statKey: string) {
  const sorted = sortLeaderboard(globalEntries, statKey);
  const { steamID } = v.persistent;

  const playerIndex = sorted.findIndex(
    (entry) => entry["steam_id"] === steamID,
  );

  if (playerIndex === -1) {
    meEntries = [];
    meStartIndex = 0;
    return;
  }

  const start = Math.max(
    0,
    Math.min(playerIndex - 4, sorted.length - PAGE_SIZE),
  );

  meEntries = sorted.slice(start, start + PAGE_SIZE);
  meStartIndex = start === 0 ? 1 : start + 1;
}

function displayEntries() {
  const [statKey] = Stats[currentStatIndex] ?? [];
  if (statKey === undefined) {
    return;
  }

  let leaderboardEntries: PlayerEntry[] = [];
  switch (CURRENT_LEADERBOARD) {
    case LeaderboardType.GLOBAL: {
      // Global Leaderboard
      leaderboardEntries = sortLeaderboard(
        globalEntries,
        statKey,
      ) as PlayerEntry[];
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
  totalPages = Math.ceil(leaderboardEntries.length / PAGE_SIZE);

  const defaultColor = KColor(0.216, 0.168, 0.176, 1);
  const userColor = KColor(0.3, 0, 0, 1);
  const baseX = pos.X - 468.5;
  const baseY = pos.Y + 1342.5;

  const leaderboardName = statKey.replaceAll("_", " ");
  const titleX = baseX + 150;
  const titleY = baseY + (leaderboardName.split(" ").length > 2 ? 35 : 41);

  const lines = splitTitle(leaderboardName);
  for (const [i, line] of lines.entries()) {
    title.DrawString(line, titleX, titleY + i * 10, defaultColor, 169, true);
  }

  const startIndex = currentPage * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, leaderboardEntries.length);
  const entryX = baseX + 110;
  const entryY = baseY + 77;
  const statColumnX = baseX + 356;

  const { steamID } = v.persistent;

  for (let i = startIndex; i < endIndex; i++) {
    const entry = leaderboardEntries[i];
    if (entry === undefined) {
      continue;
    }

    const rank =
      CURRENT_LEADERBOARD === LeaderboardType.ME
        ? meStartIndex + (i - startIndex)
        : i + 1;
    const yPos = entryY + (i - startIndex) * 14;

    const entryColor = steamID === entry["steam_id"] ? userColor : defaultColor;

    const nameText = `${rank}. ${entry["steam_name"] as string}`;
    font.DrawString(nameText, entryX, yPos, entryColor, 0, false);

    const statValue = tostring(entry[statKey]);
    const statWidth = font.GetStringWidth(statValue);
    font.DrawString(
      statValue,
      statColumnX - statWidth,
      yPos,
      entryColor,
      0,
      false,
    );
  }
}

function splitTitle(leaderboard_title: string): readonly string[] {
  const words = leaderboard_title.split(" ");
  if (words.length <= 2) {
    return [leaderboard_title];
  }

  return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
}

function renderHelper() {
  helper.Update();

  if (lastUsedInputDevice === "controller") {
    helper.SetFrame("Idle", 1);
  } else {
    helper.SetFrame("Idle", 0);
  }

  helper.Render(Vector(pos.X - 138.5, pos.Y + 1372.5));
}

function findSteamID() {
  const user = parseVDF(getSteamLoginUsersPath());
  if (user === undefined) {
    Isaac.DebugString("Failed to find most recent user");
    return;
  }
  if (socket === null) {
    Isaac.DebugString("Socket not available");
    return;
  }
  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, friendErr] = tcp.connect(SERVER_HOST, SERVER_PORT);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${friendErr}`);
    return;
  }
  const request =
    `GET /friends?steam_id=${user.id} HTTP/1.1\r\n`
    + `Host: ${SERVER_HOST}\r\n`
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
  v.persistent.steamID = user.id;
  v.persistent.steamName = user.name;
  v.persistent.friendsList = friendsList ?? "";
  Isaac.DebugString(
    `Found steamID: ${user.id}, steamName: ${user.name}, and friendsList: ${friendsList}`,
  );
}

function parseVDF(path: string | undefined) {
  const user = { id: "", name: "" };
  if (path === undefined) {
    Isaac.DebugString("Could not find loginusers.vdf");
    return undefined;
  }

  const [file, err] = io.open(path, "r");
  if (!file) {
    Isaac.DebugString(`Failed to open file: ${err}`);
    return undefined;
  }

  const content = file.read("a");
  file.close();

  if (content === undefined) {
    Isaac.DebugString("No content in loginusers.vdf");
    return undefined;
  }

  for (const line of content.split("\n")) {
    if (
      line.includes("7656119")
      && !line.toLowerCase().includes("accountname")
    ) {
      const id = line.split('"')[1];
      if (id === undefined) {
        Isaac.DebugString("Failed to find Steam ID");
        return undefined;
      }
      user.id = id;
    }
    if (line.toLowerCase().includes("personaname")) {
      const name = line.split('"')[3];
      if (name === undefined) {
        Isaac.DebugString("Failed to find Steam Name");
        return undefined;
      }
      user.name = name;
    }
  }
  return user;
}

function getSteamLoginUsersPath(): string | undefined {
  const home = os.getenv("HOME");
  const appData = os.getenv("APPDATA");
  Isaac.DebugString(`${home} ${appData}`);
  // Mac
  if (home !== undefined) {
    const path = `${home}/Library/Application Support/Steam/config/loginusers.vdf`;
    const result = io.open(path, "r");
    const file = result[0];
    if (file !== undefined) {
      file.close();
      return path;
    }
  }
  // Linux
  if (home !== undefined) {
    const paths = [
      `${home}/.steam/steam/config/loginusers.vdf`,
      `${home}/.local/share/Steam/config/loginusers.vdf`,
    ];

    for (const path of paths) {
      const result = io.open(path, "r");
      const file = result[0];
      if (file !== undefined) {
        file.close();
        return path;
      }
    }
  }

  // Windows
  if (appData !== undefined) {
    const [cmd] = io.popen(
      // eslint-disable-next-line unicorn/prefer-string-raw
      'cmd /c "C:\\Windows\\System32\\reg.exe query HKCU\\Software\\Valve\\Steam /v SteamPath" 2>&1',
    );
    if (!cmd) {
      Isaac.DebugString("popen failed");
      return undefined;
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
    return path;
  }

  return undefined;
}

function uploadData() {
  if (v.persistent.steamID === "") {
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
  const { steamID } = v.persistent;
  const { steamName } = v.persistent;

  const payload = {
    steam_id: steamID,
    steam_name: steamName,
    ...playerStats,
  };
  const json = jsonEncode(payload);
  const request =
    "POST /submit HTTP/1.1\r\n"
    + `Host: ${SERVER_HOST}\r\n`
    + "Content-Type: application/json\r\n"
    + `Content-Length: ${json.length}\r\n`
    + `\r\n${json}`;

  if (socket === null) {
    Isaac.DebugString("Socket not available");
    return;
  }
  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, err] = tcp.connect(SERVER_HOST, SERVER_PORT);
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

let downloadStartTime = 0;
const DOWNLOAD_TIMEOUT = 10_000;
function requestDownload() {
  if (socket === null) {
    Isaac.DebugString("Socket not available");
    leaderboardState = "hidden";
    SHOW_LEADERBOARD = false;
    return;
  }

  if (activeTCP !== undefined) {
    activeTCP.close();
    activeTCP = undefined;
  }

  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, err] = tcp.connect(SERVER_HOST, SERVER_PORT);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${err}`);
    leaderboardState = "hidden";
    SHOW_LEADERBOARD = false;
    return;
  }

  const request =
    "GET /leaderboard HTTP/1.1\r\n"
    + `Host: ${SERVER_HOST}\r\n`
    + "Connection: close\r\n"
    + "Content-Type: application/json\r\n\r\n";

  const [sent, sendErr] = tcp.send(request);
  if (sent === undefined) {
    Isaac.DebugString(`Failed to send GET: ${sendErr}`);
    tcp.close();
    leaderboardState = "hidden";
    SHOW_LEADERBOARD = false;
    return;
  }

  tcp.settimeout(0);
  activeTCP = tcp;
  downloadStartTime = Isaac.GetTime();
}

function downloadData() {
  if (activeTCP === undefined) {
    Isaac.DebugString("No active TCP connection for leaderboard data");
    leaderboardState = "hidden";
    SHOW_LEADERBOARD = false;
    return;
  }

  const currentTime = Isaac.GetTime();
  if (currentTime - downloadStartTime > DOWNLOAD_TIMEOUT) {
    Isaac.DebugString("Download timed out");
    cleanupDownload();
    leaderboardState = "hidden";
    SHOW_LEADERBOARD = false;
    return;
  }

  if (receivedLength === 0) {
    downloadLine = activeTCP.receive("*l");

    if (
      downloadLine[0] !== undefined
      && downloadLine[0].includes("Content-Length:")
    ) {
      const int = downloadLine[0].split("Content-Length:")[1];
      if (int !== undefined) {
        receivedLength = Number.parseInt(int.trim(), 10);
      }
    }
  } else if (downloadLine === undefined || downloadLine[0] !== "") {
    downloadLine = activeTCP.receive("*l");
  } else {
    const CHUNK_SIZE = 65_535;
    const remaining = receivedLength - totalReceived;

    if (remaining <= 0) {
      const parsed = jsonDecode(entries);
      if (parsed !== undefined && Array.isArray(parsed)) {
        globalEntries = parsed as PlayerEntry[];
        leaderboardState = "visible";
        leaderboard.Play("Idle", true);
      } else {
        Isaac.DebugString("Failed to parse JSON - data may be corrupted");
        Isaac.DebugString(`First 200 chars: ${entries.slice(0, 200)}`);
        Isaac.DebugString(`Last 200 chars: ${entries.slice(-200)}`);
        leaderboardState = "hidden";
        SHOW_LEADERBOARD = false;
      }
      cleanupDownload();
      return;
    }

    const toReceive = Math.min(CHUNK_SIZE, remaining);
    const data = activeTCP.receive(toReceive);

    if (data[0] !== undefined) {
      entries += data[0];
      totalReceived += data[0].length;
    }
  }
}

function resetDefault() {
  leaderboard.Play("Appear", true);
  leaderboardState = "hidden";
  SHOW_LEADERBOARD = false;
  CURRENT_LEADERBOARD = LeaderboardType.GLOBAL;
  globalEntries = [];
  friendEntries = [];
  meEntries = [];
  currentStatIndex = 0;
  currentPage = 0;

  cleanupDownload();
}

function cleanupDownload() {
  if (activeTCP !== undefined) {
    activeTCP.close();
    activeTCP = undefined;
  }
  downloadLine = undefined;
  receivedLength = 0;
  entries = "";
  totalReceived = 0;
  downloadStartTime = 0;
}

function sortLeaderboard(
  leaderboardEntries: readonly PlayerEntry[],
  stat: string,
) {
  const sorted: readonly PlayerEntry[] = [...leaderboardEntries].toSorted(
    (a, b) => {
      const aVal = typeof a[stat] === "number" ? a[stat] : 0;
      const bVal = typeof b[stat] === "number" ? b[stat] : 0;
      return bVal - aVal;
    },
  );

  return sorted;
}
