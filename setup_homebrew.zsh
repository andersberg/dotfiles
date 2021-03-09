#!/usr/bin/env zsh

echo "\n<<< Starting Homebrew Setup >>>\n"

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Formulas
brew install httpie
brew install bat

# Casks
brew install google-chrome
brew install visual-studio-code