param(
  [string]$Command = "help"
)

function Info($msg) {
  Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Ok($msg) {
  Write-Host "[OK] $msg" -ForegroundColor Green
}

function Err($msg) {
  Write-Host "[ERROR] $msg" -ForegroundColor Red
  exit 1
}

switch ($Command) {

  "doctor" {
    Info "Running Koperasi OS sanity check"

    if (!(Test-Path "arsitektur-final.md")) { Err "arsitektur-final.md missing" }
    if (!(Test-Path "todo.md")) { Err "todo.md missing" }
    if (!(Test-Path "supabase/migrations")) { Err "supabase/migrations missing" }
    if (!(Test-Path "supabase/migrations/tests")) { Err "supabase/migrations/tests missing" }

    Ok "Project structure looks sane"
  }

  "rls-verify" {
    Info "Running RLS verification tests"

    if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
      Err "Supabase CLI not found"
    }

    if (!(Test-Path "supabase/migrations/tests")) {
      Err "No RLS tests directory found"
    }

    supabase test db -f supabase/migrations/tests/*.sql
    if ($LASTEXITCODE -ne 0) {
      Err "RLS verification failed"
    }

    Ok "RLS verification passed"
  }

  "member-check" {
    Info "Checking member registration readiness"

    $requiredFiles = @(
      "supabase/migrations",
      "supabase/migrations/tests",
      "src/app",
      "src/lib"
    )

    foreach ($path in $requiredFiles) {
      if (!(Test-Path $path)) {
        Err "Missing required path: $path"
      }
    }

    Ok "Member registration prerequisites present"
  }

  "ci-sanity" {
    Info "Running CI sanity checks (local)"

    # Run doctor check
    if (!(Test-Path "arsitektur-final.md")) { Err "arsitektur-final.md missing" }
    if (!(Test-Path "todo.md")) { Err "todo.md missing" }
    if (!(Test-Path "supabase/migrations")) { Err "supabase/migrations missing" }
    if (!(Test-Path "supabase/migrations/tests")) { Err "supabase/migrations/tests missing" }
    Ok "Project structure looks sane"

    # Run RLS verification
    if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
      Err "Supabase CLI not found"
    }
    if (!(Test-Path "supabase/rls_tests")) {
      Err "No RLS tests directory found"
    }
    supabase test db -f supabase/migrations/tests/*.sql
    if ($LASTEXITCODE -ne 0) {
      Err "RLS verification failed"
    }
    Ok "RLS verification passed"

    Ok "CI sanity checks passed"
  }

  default {
    Write-Host ""
    Write-Host "Koperasi OS - kos.ps1 (minimal)"
    Write-Host ""
    Write-Host "Available commands:"
    Write-Host "  kos doctor"
    Write-Host "  kos rls-verify"
    Write-Host "  kos member-check"
    Write-Host "  kos ci-sanity"
    Write-Host ""
    Write-Host "All commands are read-only to schema."
  }
}
