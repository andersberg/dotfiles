# PROMPTs
# Main prompt
PROMPT="
%1~ %L %# "

# Right Prompt
# Show time
RPROMPT="%*"

# PATH
# Add Visual Studio Code (code)
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"

# VARIABLES
# Syntax highlighting for man pages using bat
export MANPAGER="sh -c 'col -bx | bat -l man -p'"

# FUNCTIONS
# Create directory and change to that directory
function mkcd () {
  mkdir -p "$@" && cd "$_"
}
# Recursively remove directories and files without prompting.
function rmrf () {
  rm -rf "$1"
}

# ALIASES

# Modifications
# Open .zshrc to be edited in VS Code
alias change="code ~/.zshrc"
# Re-run source command on .zshrc to update current terminal session with new settings
alias update="source ~/.zshrc"

# List
alias ls="ls -lAFh"
alias lsa="ls -A"

# Directories
alias md="mkdir $1"
alias mdcd="mkdcd $1"

# Delete
alias rmrf="rmrf $1"

# Navigation shortcuts
# Move directory up one level
alias ..="cd .."
# Move directory up two levels
alias ...="cd ../.."
# Move directory up three levels
alias ....="cd ../../.."
# Change directory to ~
alias home="cd ~"
alias repos="cd ~/Repos/"
alias sandbox="cd ~/Repos/sandbox/"
# Change directory to iCloud Drive folder
alias drive="cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/"

# SETTINGS
# This loads nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 

# Set editor to Nano
export EDITOR=/usr/bin/nano

# LANGUAGES
export LC_ALL=en_US.UTF-8
