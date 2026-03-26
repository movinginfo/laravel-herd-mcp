param(
    [string]$NVM_PATH
)

$NVM_HOME = $NVM_PATH
$NVM_SYMLINK = "C:\Program Files\nodejs"

# Setting environment variables system-wide
[Environment]::SetEnvironmentVariable("NVM_HOME", $NVM_HOME, [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("NVM_SYMLINK", $NVM_SYMLINK, [EnvironmentVariableTarget]::Machine)

# Writing PATH to a file
"PATH=$env:PATH" | Out-File "$NVM_HOME\PATH.txt"

# Updating the PATH environment variable
$Path = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
$NewPath = "$Path;$NVM_HOME;$NVM_SYMLINK"
[Environment]::SetEnvironmentVariable("PATH", $NewPath, [EnvironmentVariableTarget]::Machine)

# Determine system architecture
if (Test-Path "$env:SYSTEMDRIVE\Program Files (x86)\") {
    $SYS_ARCH = 64
} else {
    $SYS_ARCH = 32
}

# Force short path names to avoid issues with spaces in path names
$a = New-Object -ComObject Scripting.FileSystemObject
$NVM_HOME = $a.GetFolder($NVM_HOME).ShortPath

$content = "root: " + $NVM_HOME + "`r`n" +
           "arch: " + $SYS_ARCH + "`r`n" +
           "proxy: none`r`n" +  # Assuming "none" is directly written for proxy
           "originalpath: `r`n" +  # Adjust if different env variables are used
           "originalversion: `r`n" +
           "node_mirror: `r`n" +
           "npm_mirror: "

# Write the content to the settings file
$content | Out-File -FilePath "$NVM_HOME\settings.txt" -Encoding ASCII -Force

$env:NVM_HOME = $NVM_HOME
$env:NVM_SYMLINK = $NVM_SYMLINK

# Setting up nvm
& $NVM_HOME\nvm.exe root "$NVM_HOME"

# Installing latest node.js
& $NVM_HOME\nvm.exe install latest

# Setting up the default node.js version
& $NVM_HOME\nvm.exe use latest