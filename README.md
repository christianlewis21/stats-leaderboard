# Stats Leaderboard

Stats Leaderboard is a mod for [_The Binding of Isaac: Repentance+_](https://store.steampowered.com/app/3353470/The_Binding_of_Isaac_Repentance/), written in [TypeScript](https://www.typescriptlang.org/) using the [IsaacScript](https://isaacscript.github.io/) framework.

## How To Play

This mod is downloaded on the [ Steam Workshop ](https://steamcommunity.com/sharedfiles/filedetails/?id=3720196936).
All instructions to use the mod are located on this page.

## How To Compile

If you are a developer you can play the mod by compiling the TypeScript code into a "main.lua" file. Perform the following steps:

- Download and install [Node.js](https://nodejs.org/en/download/) (Windows Installer .msi, 64-bit).
- Download and install [Git](https://git-scm.com/download/win) (64-bit Git for Windows setup).
- Download (or clone) this repository:
  - Click on the "Code" button in the top-right-corner of this page.
  - Click on "Download ZIP".
- Unzip the zip file to a new directory.
- Open the command prompt (or another shell of your choice).
- Use the `cd` command to navigate to the place where you unzipped the repository.
- Use the `npm ci` command to install the project dependencies.
- Use the `npx isaacscript` command to start the IsaacScript watcher.
- If IsaacScript is successful, you will see "Compilation successful." (You can continue to leave the terminal window open; it will monitor for changes in your project, and recompile if necessary.)
- Completely close Isaac if it is already open, and then open the game again, and the mod should be in the list of mods. You can now play or test the mod.
