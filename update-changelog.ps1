# update-changelog.ps1
# Script untuk otomatis update CHANGELOG.md berdasarkan commit terbaru

# Ambil pesan commit terakhir
$lastCommit = git log -1 --pretty=%s 2>$null
if (-not $lastCommit) {
  Write-Output "Tidak ada commit ditemukan. Buat commit dulu agar changelog bisa diperbarui."
  exit 0
}

# File changelog
$changelogFile = "CHANGELOG.md"

# Jika belum ada, buat template dasar
if (-Not (Test-Path $changelogFile)) {
    Write-Output "CHANGELOG.md tidak ditemukan. Membuat file baru..."
    "# Changelog`nSemua perubahan penting pada proyek Koperasi-OS akan didokumentasikan di sini.`nFormat mengikuti Keep a Changelog dan Semantic Versioning.`n`n## [Unreleased]`n" | Out-File $changelogFile -Encoding UTF8
}

# Baca isi changelog secara utuh
$contents = Get-Content $changelogFile -Raw -Encoding UTF8

# Sisipkan commit di bawah header Unreleased
if ($contents -match "## 

\[Unreleased\]

") {
    $contents = $contents -replace "(## 

\[Unreleased\]

\s*)", "`$1- $lastCommit`n"
} else {
    $contents = "## [Unreleased]`n- $lastCommit`n`n" + $contents
}

# Simpan kembali
Set-Content -Path $changelogFile -Value $contents -Encoding UTF8

Write-Output "CHANGELOG.md berhasil diperbarui dengan commit: $lastCommit"
