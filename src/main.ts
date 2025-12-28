import { ButtonAction, ControllerIndex, NullItemID } from "isaac-typescript-definitions";
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
helper.Load("gfx/ui/helper/seedwidget.anm2", true);
helper.Play("Idle", true);

const infobox = Sprite();
infobox.Load("gfx/ui/infobox/infobox.anm2", true);
infobox.Play("Appear", true);
// End Sprites

// Booleans
let showLeaderboard = false
// End Booleans
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
    updateLeaderboard,
  );
  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    renderLeaderboard,
  );
}

function renderLeaderboard() {
  if (MenuManager.GetActiveMenu() === MainMenuType.STATS) {
    if (Input.IsActionTriggered(
        ButtonAction.MENU_TAB,
        ControllerIndex.KEYBOARD,
      )
        || Input.IsActionTriggered(
          ButtonAction.MENU_TAB,
          ControllerIndex.CONTROLLER_1,
        )) {
          showLeaderboard = !showLeaderboard
        }
    if (showLeaderboard) {
      leaderboard.Update()
      leaderboard.Render(Vector(120, 120))
      if (leaderboard.IsFinished("Appear")) {
        leaderboard.Play("Idle", true)
      }
    }
  } else {
    leaderboard.Play("Appear", true);
    showLeaderboard = false
  }
}

function updateLeaderboard() {

  const [enabled, requiredSocket] = pcall(require, "socket");
  if (enabled) {
    const socket: Socket | null = requiredSocket as Socket;
    print(socket)
  } else {
    Isaac.DebugString("--luadebug is not enabled.");
  }
}

function findLoginPath() {
  if (
    MenuManager.GetActiveMenu() === MainMenuType.GAME
    && (Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)
      || Input.IsActionTriggered(
        ButtonAction.BOMB,
        ControllerIndex.CONTROLLER_1,
      ))
  ) {
    loadInfoBox();
    Isaac.DebugString("test");
  }
}

function loadInfoBox() {
  Isaac.DebugString("Loading InfoBox");
}
