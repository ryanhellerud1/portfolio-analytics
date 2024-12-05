#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create virtual environment if it doesn't exist
if [ ! -d "$DIR/../venv" ]; then
    python3 -m venv "$DIR/../venv"
fi

# Activate virtual environment
source "$DIR/../venv/bin/activate"

# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
python -m pip install -r "$DIR/../requirements.txt"

# Print Python info
python -c "import sys; print('Python executable:', sys.executable)"
python -c "import snowflake.connector; print('Snowflake connector version:', snowflake.connector.__version__)"
python -c "import dotenv; print('python-dotenv is installed')" 