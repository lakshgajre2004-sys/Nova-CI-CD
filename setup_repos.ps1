$ErrorActionPreference = "Continue"

$repos = @(
    @{ name="nova-repo-1"; branches=@("main", "staging") },
    @{ name="nova-repo-2"; branches=@("main", "feature/auth") },
    @{ name="nova-repo-3"; branches=@("main", "hotfix/docker") }
)

$packageJson = @"
{
  "name": "nova-demo",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "build": "echo Build successful",
    "test": "echo Tests passed"
  }
}
"@

$indexJs = @"
console.log("Nova pipeline test");
"@

cd c:\Users\Laksh\Nova
mkdir temp-repos -Force | Out-Null
cd temp-repos

foreach ($repo in $repos) {
    $repoName = $repo.name
    Write-Host "Processing $repoName..."
    
    if (Test-Path $repoName) {
        Remove-Item -Recurse -Force $repoName
    }
    
    git clone "https://github.com/lakshgajre2004-sys/$repoName.git"
    cd $repoName
    
    foreach ($branch in $repo.branches) {
        Write-Host "  Branch: $branch"
        
        # Determine if branch exists on remote
        $remoteBranchExists = git ls-remote --heads origin $branch
        
        if ($remoteBranchExists) {
            git checkout $branch
        } else {
            git checkout -b $branch
        }
        
        $packageJson | Out-File -Encoding ascii "package.json"
        $indexJs | Out-File -Encoding ascii "index.js"
        
        npm install
        npm run build
        npm test
        
        git add package.json index.js
        git commit -m "setup pipeline runtime"
        git push -u origin $branch
    }
    
    cd ..
}

Write-Host "All repositories processed."
