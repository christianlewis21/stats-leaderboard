import { ButtonAction, ControllerIndex } from "isaac-typescript-definitions";
import {
  EventCounter,
  MainMenuType,
  ModCallbackRepentogon,
} from "isaac-typescript-definitions-repentogon";
import { ISCFeature, jsonEncode, upgradeMod } from "isaacscript-common";

const modVanilla = RegisterMod("Stats Leaderboard", 1);
const ISC_FEATURES = [ISCFeature.RUN_IN_N_FRAMES] as const;
const mod = upgradeMod(modVanilla, ISC_FEATURES);
// Sprites
const leaderboard = Sprite();
leaderboard.Load("gfx/ui/leaderboard/leaderboard.anm2", true);
leaderboard.Play("Appear", true);

const helper = Sprite();
helper.Load("gfx/ui/helper/helper.anm2", true);
helper.Play("Idle", true);

/* const loading = Sprite();
loading.Load("gfx/ui/loading/loading.anm2", true);
loading.Play("Appear", true); */
// End Sprites

// Booleans
let SHOW_LEADERBOARD = false;
let GLOBAL_SELECTED = true;
/* let STEAM_ID_FOUND = false;
let LOAD_LAUNCHER = false; */
let FIND_STEAM = false;
let DATA_FETCHED = false;
// End Booleans

// Fonts
const font = Font();
font.Load("font/teammeatfont10.fnt");
// End Fonts

let socket: Socket | null = null;

const Stats = {
  mom_kills: EventCounter.MOM_KILLS,
  rocks_destroyed: EventCounter.ROCKS_DESTROYED,
  tinted_rocks_destroyed: EventCounter.TINTED_ROCKS_DESTROYED,
  super_special_rocks_destroyed: EventCounter.SUPER_SPECIAL_ROCKS_DESTROYED,
  poop_destroyed: EventCounter.POOP_DESTROYED,
  pills_eaten: EventCounter.PILLS_EATEN,
  xiii_death_card_used: EventCounter.XIII_DEATH_CARD_USED,
  arcades_entered: EventCounter.ARCADES_ENTERED,
  deaths: EventCounter.DEATHS,
  isaac_kills: EventCounter.ISAAC_KILLS,
  shopkeeper_killed: EventCounter.SHOPKEEPER_KILLED,
  satan_kills: EventCounter.SATAN_KILLS,
  shell_games_played: EventCounter.SHELL_GAMES_PLAYED,
  angel_deals_taken: EventCounter.ANGEL_DEALS_TAKEN,
  devil_deals_taken: EventCounter.DEVIL_DEALS_TAKEN,
  blood_donation_machine_used: EventCounter.BLOOD_DONATION_MACHINE_USED,
  slot_machines_broken: EventCounter.SLOT_MACHINES_BROKEN,
  donation_machine_counter: EventCounter.DONATION_MACHINE_COUNTER,
  eden_tokens: EventCounter.EDEN_TOKENS,
  streak_counter: EventCounter.STREAK_COUNTER,
  best_streak: EventCounter.BEST_STREAK,
  blue_baby_kills: EventCounter.BLUE_BABY_KILLS,
  lamb_kills: EventCounter.LAMB_KILLS,
  mega_satan_kills: EventCounter.MEGA_SATAN_KILLS,
  boss_rushes_cleared: EventCounter.BOSS_RUSHES_CLEARED,
  negative_streak_counter: EventCounter.NEGATIVE_STREAK_COUNTER,
  greed_donation_machine_counter: EventCounter.GREED_DONATION_MACHINE_COUNTER,
  hush_kills: EventCounter.HUSH_KILLS,
  delirium_kills: EventCounter.DELIRIUM_KILLS,
  dailies_played: EventCounter.DAILIES_PLAYED,
  dailies_streak: EventCounter.DAILIES_STREAK,
  dailies_won: EventCounter.DAILIES_WON,
  rainbow_poop_destroyed: EventCounter.RAINBOW_POOP_DESTROYED,
  batteries_collected: EventCounter.BATTERIES_COLLECTED,
  cards_used: EventCounter.CARDS_USED,
  shop_items_bought: EventCounter.SHOP_ITEMS_BOUGHT,
  chests_opened_with_key: EventCounter.CHESTS_OPENED_WITH_KEY,
  secret_rooms_walls_opened: EventCounter.SECRET_ROOMS_WALLS_OPENED,
  beds_used: EventCounter.BEDS_USED,
  mother_kills: EventCounter.MOTHER_KILLS,
  beast_kills: EventCounter.BEAST_KILLS,
  baby_plum_kills: EventCounter.BABY_PLUM_KILLS,
  battery_bums_killed: EventCounter.BATTERY_BUMS_KILLED,
  battery_bum_collectible_payouts: EventCounter.BATTERY_BUM_COLLECTIBLE_PAYOUTS,
} as const;

export function main(): void {
  /* mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    findLoginPath,
  ); */
  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    renderLeaderboard,
  );
}

function renderLeaderboard() {
  if (MenuManager.GetActiveMenu() === MainMenuType.STATS) {
    renderHelper();
    if (!FIND_STEAM) {
      findSteamID();
    }
    if (!DATA_FETCHED) {
      getLeaderboardData();
      DATA_FETCHED = true;
    }
    if (Input.IsActionTriggered(ButtonAction.MAP, ControllerIndex.KEYBOARD)) {
      Isaac.DebugString("Tab Clicked");
      SHOW_LEADERBOARD = !SHOW_LEADERBOARD;
      GLOBAL_SELECTED = true;
    }
    if (SHOW_LEADERBOARD) {
      leaderboard.Update();
      leaderboard.Render(Vector(0, 0));
      if (leaderboard.IsFinished("Appear")) {
        leaderboard.Play("Idle", true);
      }
      if (leaderboard.GetAnimation() === "Idle") {
        fetchLeaderboardData();
      }
    } else if (leaderboard.GetAnimation() === "Idle") {
      leaderboard.Play("Disappear", true);
    } else if (
      !leaderboard.IsFinished("Disappear")
      && leaderboard.GetAnimation() === "Disappear"
    ) {
      leaderboard.Update();
      leaderboard.Render(Vector(0, 0));
    } else if (leaderboard.IsFinished("Disappear")) {
      leaderboard.Play("Appear", true);
    }
    if (Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)) {
      GLOBAL_SELECTED = !GLOBAL_SELECTED;
      if (GLOBAL_SELECTED) {
        leaderboard.SetFrame("Idle", 0);
      } else {
        leaderboard.SetFrame("Idle", 2);
      }
    }
  } else {
    leaderboard.Play("Appear", true);
    SHOW_LEADERBOARD = false;
    GLOBAL_SELECTED = true;
    DATA_FETCHED = false;
  }
}

function fetchLeaderboardData() {
  Isaac.DebugString("Displaying Data");
}

function renderHelper() {
  if (!StatsMenu.IsSecretsMenuVisible()) {
    const pos = MenuManager.GetViewPosition();
    helper.Update();
    helper.Render(Vector(pos.X - 138.5, pos.Y + 1372.5));
  }
}
/* Keeping in case I don't like how it works now.
function findLoginPath() {
  if (
    MenuManager.GetActiveMenu() === MainMenuType.GAME
    && Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)
  ) {
    LOAD_LAUNCHER = true;
    findSteamID();
  }
  if (LOAD_LAUNCHER && MenuManager.GetActiveMenu() === MainMenuType.GAME) {
    loadInfoBox();
  } else {
    loading.Play("Appear", true);
    LOAD_LAUNCHER = false;
  }
}
Same for this function.
function loadInfoBox() {
  Isaac.DebugString("Loading Info Box");
  if (!loading.IsFinished("Disappear")) {
    loading.Update();
    loading.Render(Vector(0, 0));
  }
  if (loading.IsFinished("Appear")) {
    loading.Play("Idle", true);
  }
  if (STEAM_ID_FOUND) {
    loading.Play("Disappear", true);
    STEAM_ID_FOUND = false;
    LOAD_LAUNCHER = false;
  }
  if (loading.IsPlaying("Idle")) {
    const x = Isaac.GetScreenWidth() / 2;
    const y = Isaac.GetScreenHeight() / 2;
    font.DrawString(
      "Finding Steam ID and Name",
      x,
      y,
      KColor(0.216, 0.168, 0.176, 1),
      10,
      true,
    );
  }
}
*/
function findSteamID() {
  const [cmd] = io.popen(
    // eslint-disable-next-line unicorn/prefer-string-raw
    'cmd /c "C:\\Windows\\System32\\reg.exe query HKCU\\Software\\Valve\\Steam /v SteamPath" 2>&1',
  );
  if (!cmd) {
    Isaac.DebugString("Popen failed");
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
  Isaac.DebugString(`Found Steam Name and Id: ${steamID}, ${steamName}`);
  FIND_STEAM = true;
  mod.SaveData(`${steamID}:${steamName}:true`);
}

function getLeaderboardData() {
  uploadData();
  const leaderboardData = downloadData();
  if (leaderboardData === undefined) {
    Isaac.DebugString("An error has occurred downloading the leaderboard");
    return;
  }
  Isaac.DebugString(`Leaderboard Data:${leaderboardData}`);
}

function uploadData() {
  const gameData = Isaac.GetPersistentGameData();
  const playerStats: Record<string, number> = {};
  for (const [event, counter] of Object.entries(Stats)) {
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
    + "Host: 54.237.222.18\r\n"
    + "Content-Type: application/json\r\n"
    + `Content-Length: ${json.length}\r\n`
    + `\r\n${json}`;

  const [ok, requiredSocket] = pcall(require, "socket");
  if (ok) {
    socket = requiredSocket as Socket;
  } else {
    Isaac.DebugString("Lua Debug must be enabled for leaderboard to load");
    return;
  }

  const tcp = socket.tcp();
  tcp.settimeout(5);
  const [connected, err] = tcp.connect("54.237.222.18", 80);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${err}`);
    return;
  }

  const send = tcp.send(request);
  if (send[0] === undefined) {
    Isaac.DebugString(`Userdata failed to send: ${send[1]}`);
    return;
  }
  Isaac.DebugString("Successfully uploaded userdata");
  tcp.close();
}

function downloadData() {
  const [ok, requiredSocket] = pcall(require, "socket");
  if (ok) {
    socket = requiredSocket as Socket;
  } else {
    Isaac.DebugString("Lua Debug must be enabled for leaderboard to load");
    return undefined;
  }

  const tcp = socket.tcp();
  tcp.settimeout(30);
  const [connected, err] = tcp.connect("54.237.222.18", 80);
  if (connected !== 1) {
    Isaac.DebugString(`Socket failed to connect: ${err}`);
    return undefined;
  }

  const request =
    "GET /leaderboard HTTP/1.1\r\n"
    + "Host: 54.237.222.18\r\n"
    + "Content-Type: application/json\r\n\r\n";

  const [sent, sendErr] = tcp.send(request);
  if (sent === undefined) {
    Isaac.DebugString(`Failed to send GET: ${sendErr}`);
    tcp.close();
    return undefined;
  }

  const [response, responseErr] = tcp.receive("*a");
  if (response === undefined) {
    Isaac.DebugString(`Error: ${responseErr}`);
    return "undefined";
  }
  tcp.close();
  Isaac.DebugString(response);
  const lines = response.split("\n");
  return lines.at(-1);
}
