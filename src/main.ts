import { ButtonAction, ControllerIndex } from "isaac-typescript-definitions";
import {
  MainMenuType,
  ModCallbackRepentogon,
} from "isaac-typescript-definitions-repentogon";
import { ISCFeature, upgradeMod } from "isaacscript-common";

// Sprites
const leaderboard = Sprite();
leaderboard.Load("gfx/ui/leaderboard/leaderboard.anm2", true);
leaderboard.Play("Appear", true);

const helper = Sprite();
helper.Load("gfx/ui/helper/helper.anm2", true);
helper.Play("Idle", true);

const loading = Sprite();
loading.Load("gfx/ui/loading/loading.anm2", true);
loading.Play("Appear", true);
// End Sprites

// Booleans
let SHOW_LEADERBOARD = false;
let GLOBAL_SELECTED = true;
let FINDING_STEAM_CREDENTIALS = false;
let STEAM_ID_FOUND = false;
// End Booleans

// Popen
const _popen = io.popen;

function SafePopen(cmd: string) {
  return _popen(cmd);
}
// End Popen

export function main(): void {
  const modVanilla = RegisterMod("Stats Leaderboard", 1);
  const ISC_FEATURES = [ISCFeature.RUN_IN_N_FRAMES] as const;
  const mod = upgradeMod(modVanilla, ISC_FEATURES);

  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    findLoginPath,
  );
  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    renderLeaderboard,
  );
}

function renderLeaderboard() {
  if (MenuManager.GetActiveMenu() === MainMenuType.STATS) {
    renderHelper();
    if (Input.IsActionTriggered(ButtonAction.MAP, ControllerIndex.KEYBOARD)) {
      Isaac.DebugString("Tab Clicked");
      SHOW_LEADERBOARD = !SHOW_LEADERBOARD;
      GLOBAL_SELECTED = true;
    }
    if (SHOW_LEADERBOARD) {
      Isaac.DebugString("Showing leaderboard");
      leaderboard.Update();
      leaderboard.Render(Vector(0, 0));
      if (leaderboard.IsFinished("Appear")) {
        Isaac.DebugString("Playing Idle anim");
        leaderboard.Play("Idle", true);
      }
      if (leaderboard.GetAnimation() === "Idle") {
        Isaac.DebugString("Fetching Data");
        fetchLeaderboardData();
      }
    } else if (leaderboard.GetAnimation() === "Idle") {
      Isaac.DebugString("Disappearing");
      leaderboard.Play("Disappear", true);
    } else if (
      !leaderboard.IsFinished("Disappear")
      && leaderboard.GetAnimation() === "Disappear"
    ) {
      Isaac.DebugString("Continuing to update for Disappear");
      leaderboard.Update();
      leaderboard.Render(Vector(0, 0));
    } else if (leaderboard.IsFinished("Disappear")) {
      Isaac.DebugString("Now Playing Appear");
      leaderboard.Play("Appear", true);
    }
    if (Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)) {
      GLOBAL_SELECTED = !GLOBAL_SELECTED;
      if (GLOBAL_SELECTED) {
        Isaac.DebugString("Global Selected");
        leaderboard.SetFrame("Idle", 0);
      } else {
        leaderboard.SetFrame("Idle", 2);
      }
    }
  } else {
    // Isaac.DebugString("Back to Appear");
    leaderboard.Play("Appear", true);
    SHOW_LEADERBOARD = false;
    GLOBAL_SELECTED = true;
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

function findLoginPath() {
  if (
    MenuManager.GetActiveMenu() === MainMenuType.GAME
    && Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)
  ) {
    FINDING_STEAM_CREDENTIALS = true;
  }
  if (FINDING_STEAM_CREDENTIALS) {
    loadInfoBox();
    findSteamID();
    FINDING_STEAM_CREDENTIALS = false;
  } else {
    loading.Play("Appear", true);
  }
}

function loadInfoBox() {
  Isaac.DebugString("Loading...");
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
  }
}

function findSteamID() {
  const [cmd] = SafePopen(
    // eslint-disable-next-line unicorn/prefer-string-raw
    "reg query HKCU\\Software\\Valve\\Steam /v SteamPath",
  );
  if (!cmd) {
    Isaac.DebugString("SafePopen failed");
    return;
  }
  let path = String(cmd.read("a"));

  path = path
    // eslint-disable-next-line unicorn/prefer-string-raw
    .replace("HKEY_CURRENT_USER\\Software\\Valve\\Steam", "")
    .replace("SteamPath", "")
    .replace("REG_SZ", "")
    .replace(" ", "")
    .replaceAll("/", "\\")
    .trim();
  cmd.close();
  // eslint-disable-next-line unicorn/prefer-string-raw
  path += "\\config\\loginusers.vdf";

  const [file, err, errCode] = io.open(path, "r");
  if (!file) {
    Isaac.DebugString(`Failed to open file: ${err} (code ${errCode})`);
    return;
  }
  const content = file.read("a");
  if (content === undefined) {
    Isaac.DebugString("No content available in loginusers.vdf")
    return;
  }
  file.close();

  let steamID: string;
  let steamName: string;

  
}
