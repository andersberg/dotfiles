#!/usr/bin/env zsh

echo "\n<<< Starting Homebrew Setup >>>\n"

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Formulas
brew install httpie
brew install bat

# Casks
brew install --no-quarantine google-chrome
brew install --no-quarantine visual-studio-code 