const EXTENSION_MAP_PM_TO_TW = {
  "penguinmod.textPlus": "text",
  "penguinmod.bitwise": "tw.bitwise",
};

const EXTENSION_MAP_TW_TO_PM = {
  "tw.bitwise": "penguinmod.bitwise",
};

function log(msg) {
  document.getElementById("log").textContent += msg + "\n";
}

async function convert() {
  const fileInput = document.getElementById("fileInput");
  const mode = document.getElementById("mode").value;
  const file = fileInput.files[0];

  if (!file) {
    alert("Upload a file first");
    return;
  }

  document.getElementById("log").textContent = "";

  log("Loading project...");
  const zip = await JSZip.loadAsync(file);

  if (!zip.file("project.json")) {
    log("❌ project.json not found");
    return;
  }

  const project = JSON.parse(
    await zip.file("project.json").async("string")
  );

  log("Editing project.json...");

  let warnings = [];

  if (mode === "pm-to-tw") {
    project.meta.agent = "TurboWarp";
    project.extensions = project.extensions
      ?.map(ext => EXTENSION_MAP_PM_TO_TW[ext] || ext)
      .filter(ext => {
        if (ext.startsWith("penguinmod.")) {
          warnings.push(`Removed unsupported extension: ${ext}`);
          return false;
        }
        return true;
      });
  }

  if (mode === "tw-to-pm") {
    project.meta.agent = "PenguinMod";
    project.extensions = project.extensions?.map(
      ext => EXTENSION_MAP_TW_TO_PM[ext] || ext
    );
  }

  zip.file("project.json", JSON.stringify(project, null, 2));

  log("Repacking project...");
  const output = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(output);
  a.download =
    (mode === "pm-to-tw" ? "TurboWarp_" : "PenguinMod_") + file.name;
  a.click();

  log("✅ Done!");
  if (warnings.length) {
    log("\n⚠ Warnings:");
    warnings.forEach(w => log("- " + w));
  }
}
