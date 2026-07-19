<#
.SYNOPSIS
    Build the plugin and deploy the compiled artifacts to the Obsidian vault's plugin folder.

.DESCRIPTION
    Runs `pnpm build` (tsc typecheck + esbuild production bundle, per package.json), then
    copies the runtime artifacts (main.js, manifest.json, styles.css if present) into the
    vault's plugin directory, plus the worktree shell scripts under scripts/.

    The plugin resolves setup-worktree.sh / remove-worktree.sh relative to its own install
    folder (manifest.dir/scripts/*.sh), so those .sh files ARE runtime artifacts and must be
    deployed alongside main.js. Before the OneDrive migration a junction exposed them
    transparently; a plain built-file copy does not, which is why worktree creation broke.

    IMPORTANT: This script NEVER copies or overwrites data.json. data.json holds the user's
    live plugin settings inside the vault and must not be clobbered by a deploy from source.
    If the plugin needs new default settings, handle migration in code, not by copying files.

.NOTES
    Run manually from the project root: powershell -ExecutionPolicy Bypass -File scripts/deploy-to-vault.ps1
    or via `pnpm deploy` (defined in package.json).
#>

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$vaultPluginDir = "C:\Users\snapy\OneDrive\Obsidian\ObsidianMP\.obsidian\plugins\obsidian-tasks-dashboard-plugin"

Write-Output "=== Building plugin (pnpm build) ==="
Push-Location $projectRoot
try {
    pnpm build
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

if (-not (Test-Path $vaultPluginDir)) {
    New-Item -ItemType Directory -Force -Path $vaultPluginDir | Out-Null
}

# Deliberately excluded: data.json (live user settings in the vault - never overwrite it from source).
$artifactsToDeploy = @("main.js", "manifest.json", "styles.css")

Write-Output "=== Deploying artifacts to $vaultPluginDir ==="
foreach ($artifact in $artifactsToDeploy) {
    $srcPath = Join-Path $projectRoot $artifact
    if (Test-Path $srcPath) {
        Copy-Item -LiteralPath $srcPath -Destination $vaultPluginDir -Force
        Write-Output "Copied $artifact"
    } else {
        Write-Output "Skipped $artifact (not found at $srcPath)"
    }
}

# Runtime worktree scripts: the plugin shells out to these relative to its install folder.
$vaultScriptsDir = Join-Path $vaultPluginDir "scripts"
if (-not (Test-Path $vaultScriptsDir)) {
    New-Item -ItemType Directory -Force -Path $vaultScriptsDir | Out-Null
}

$scriptsToDeploy = @("setup-worktree.sh", "remove-worktree.sh")
Write-Output "=== Deploying worktree scripts to $vaultScriptsDir ==="
foreach ($scriptFile in $scriptsToDeploy) {
    $srcPath = Join-Path $PSScriptRoot $scriptFile
    if (Test-Path $srcPath) {
        Copy-Item -LiteralPath $srcPath -Destination $vaultScriptsDir -Force
        Write-Output "Copied scripts/$scriptFile"
    } else {
        Write-Output "Skipped scripts/$scriptFile (not found at $srcPath)"
    }
}

Write-Output "=== Deploy complete. data.json was NOT touched. ==="
