import { ButtonAction, ControllerIndex } from "isaac-typescript-definitions";
import {
  MainMenuType,
  ModCallbackRepentogon,
} from "isaac-typescript-definitions-repentogon";
import { ISCFeature, upgradeMod } from "isaacscript-common";

export function main(): void {
  const modVanilla = RegisterMod("Stats Leaderboard", 1);
  const ISC_FEATURES = [ISCFeature.RUN_IN_N_FRAMES] as const;
  const mod = upgradeMod(modVanilla, ISC_FEATURES);

  mod.AddCallbackRepentogon(
    ModCallbackRepentogon.POST_MAIN_MENU_RENDER,
    findLoginPath,
  );
}

function findLoginPath() {
  if (
    MenuManager.GetActiveMenu() === MainMenuType.GAME
    && Input.IsActionTriggered(ButtonAction.BOMB, ControllerIndex.KEYBOARD)
  ) {
    Isaac.DebugString("test");
  }
}
