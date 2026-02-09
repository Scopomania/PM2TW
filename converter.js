const PM_OPCODE_PREFIXES = [
  "penguinmod_",
  "pm_",
  "textplus_",
  "pmtext_",
];

function log(msg) {
  document.getElementById("log").textContent += msg + "\n";
}

function isPenguinModOpcode(opcode) {
  if (!opcode) return false;
  return PM_OPCODE_PREFIXES.some(p => opcode.startsWith(p));
}

async function convert() {
  const fileInput = document.getElementById("fileInput");
  const mode = document.getElementById("mode").value;
  const file = fileInput.files[0];

  if (!file) {
    alert("Upload a file first");
    return;
  }

  const logBox = document.getElementById("log");
  logBox.textContent = "";

  log("📦 Loading project...");
  const zip = await JSZip.loadAsync(file);

  if (!zip.file("project.json")) {
    log("❌ project.json not found");
    return;
  }

  const project = JSON.parse(
    await zip.file("project.json").async("string")
  );

  let warnings = [];
  let vaporizedBlocks = [];

  // ===============================
  // PenguinMod → TurboWarp
  // ===============================
  if (mode === "pm-to-tw") {
    log("🐧 → ⚡ Scrubbing PenguinMod identity...");

    // HARD RESET meta
    project.meta = {
      semver: "3.0.0",
      vm: "0.2.0-prerelease.2023",
      agent: "TurboWarp",
      platform: {
        name: "TurboWarp",
        url: "https://turbowarp.org"
      }
    };

    // Remove PenguinMod runtime junk
    delete project.runtimeOptions;
    delete project.customRuntime;
    delete project.penguinmod;

    // Clean extensions list
    project.extensions = (project.extensions || []).filter(ext => {
      if (ext.startsWith("penguinmod.") || ext.startsWith("pm.")) {
        warnings.push(`Removed extension: ${ext}`);
        return false;
      }
      return true;
    });

    // Scrub PenguinMod blocks
    for (const target of project.targets) {
      const spriteName = target.name || "(stage)";
      if (!target.blocks) continue;

      for (const blockId of Object.keys(target.blocks)) {
        const block = target.blocks[blockId];
        if (isPenguinModOpcode(block.opcode)) {
          vaporizedBlocks.push({
            sprite: spriteName,
            opcode: block.opcode
          });
          delete target.blocks[blockId];
        }
      }
    }
  }

  // ===============================
  // TurboWarp → PenguinMod (safe)
  // ===============================
  if (mode === "tw-to-pm") {
    log("⚡ → 🐧 Converting to PenguinMod...");

    project.meta.agent = "PenguinMod";
    project.meta.platform = {
      name: "PenguinMod",
      url: "https://penguinmod.com"
    };
  }

  // Save modified project.json
  zip.file("project.json", JSON.stringify(project, null, 2));

  log("📦 Repacking project...");
  const output = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(output);
  a.download =
    (mode === "pm-to-tw" ? "TurboWarp_" : "PenguinMod_") + file.name;
  a.click();

  log("✅ Conversion complete!");

  // ===============================
  // REPORT
  // ===============================
  if (warnings.length) {
    log("\n⚠ Extensions removed:");
    warnings.forEach(w => log(" - " + w));
  }

  if (vaporizedBlocks.length) {
    log(`\n🔥 Vaporized blocks (${vaporizedBlocks.length}):`);
    vaporizedBlocks.forEach(b =>
      log(` - [${b.sprite}] ${b.opcode}`)
    );
  } else {
    log("\n✨ No PenguinMod-only blocks detected");
  }
    }
