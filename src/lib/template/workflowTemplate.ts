/**
 * DroidForge GitHub Actions CI/CD Workflow Template
 * 
 * Generates `.github/workflows/build.yml`
 * - Ubuntu runner with JDK 17 & explicit Gradle 8.7 setup (zero binary wrapper required)
 * - Runs `gradle assembleDebug`
 * - On failure: Extracts compiler errors to `builder-status` branch `status.json`
 * - On success: Creates `builder-latest` release with `app-debug.apk`, uploads to Appetize if configured,
 *   and commits `status.json` to `builder-status` branch.
 */

export function getBuildWorkflowYaml(appName: string = 'DroidApp'): string {
  return `name: DroidForge Android CI

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    name: Assemble Native Android APK
    runs-on: ubuntu-latest
    timeout-minutes: 25

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Set up Java 17 Development Kit
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Set up Gradle 8.7
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.7'
          cache-read-only: false

      - name: Assemble Debug APK
        id: gradle_assemble
        continue-on-error: true
        run: |
          echo "Starting Gradle debug assembly for ${appName}..."
          gradle assembleDebug --stacktrace --no-daemon 2>&1 | tee build.log
          EXIT_CODE=\${PIPESTATUS[0]}
          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT
          exit $EXIT_CODE

      - name: Record Build Failure & Extract Errors
        if: steps.gradle_assemble.outputs.exit_code != '0'
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "Build failed. Extracting compiler and build diagnostics..."
          mkdir -p /tmp/droidforge_status

          cat << 'PYEOF' > /tmp/parse_errors.py
          import json, os, re

          errors = []
          last_lines = []
          if os.path.exists("build.log"):
              with open("build.log", "r", errors="ignore") as f:
                  lines = [l.strip() for l in f.readlines() if l.strip()]
              last_lines = lines[-120:]
              for line in lines:
                  if any(marker in line for marker in [
                      "e: ", "error:", "What went wrong:", "FAILURE: Build failed",
                      "Unresolved reference", "Cannot find", "Syntax error"
                  ]):
                      if line not in errors:
                          errors.append(line)

          diagnostic_errors = errors[:40] if errors else last_lines[-30:]
          if not diagnostic_errors:
              diagnostic_errors = ["Gradle assembleDebug terminated with non-zero exit code."]

          data = {
              "state": "failed",
              "errors": diagnostic_errors,
              "run": os.environ.get("GITHUB_RUN_ID", ""),
              "sha": os.environ.get("GITHUB_SHA", ""),
              "timestamp": int(__import__("time").time() * 1000)
          }

          with open("/tmp/droidforge_status/status.json", "w") as out:
              json.dump(data, out, indent=2)
          PYEOF

          python3 /tmp/parse_errors.py

          # Commit status.json to builder-status branch
          git config --global user.name "DroidForge Bot"
          git config --global user.email "bot@droidforge.local"
          git fetch origin builder-status:builder-status || true
          git checkout -B builder-status
          git rm -rf . --ignore-unmatch
          cp /tmp/droidforge_status/status.json status.json
          git add status.json
          git commit -m "build(ci): failure status for run \${{ github.run_id }} [skip ci]" || true
          git push origin builder-status --force

          echo "Status committed to builder-status branch."
          exit 1

      - name: Publish Release & Appetize Stream
        if: steps.gradle_assemble.outputs.exit_code == '0'
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          APPETIZE_SECRET: \${{ secrets.APPETIZE_TOKEN }}
        run: |
          APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
          if [ ! -f "$APK_PATH" ]; then
            echo "Error: Output APK not found at $APK_PATH"
            exit 1
          fi

          echo "Debug APK found: $APK_PATH ($(du -h "$APK_PATH" | cut -f1))"

          # 1. Update or create builder-latest release tag
          gh release delete builder-latest --yes || true
          gh release create builder-latest "$APK_PATH" \\
            --title "${appName} Debug Build (\${{ github.run_number }})" \\
            --notes "Automated native Android build from DroidForge. Commit: \${{ github.sha }}" \\
            --target "\${{ github.sha }}"

          APK_DOWNLOAD_URL="https://github.com/\${{ github.repository }}/releases/download/builder-latest/app-debug.apk"
          APPETIZE_PUB_KEY=""

          # 2. Upload to Appetize.io if secret configured
          if [ -n "$APPETIZE_SECRET" ]; then
            echo "APPETIZE_TOKEN found. Uploading APK to Appetize.io..."
            RESPONSE=$(curl -s -X POST https://api.appetize.io/v1/apps \\
              -H "X-API-KEY: $APPETIZE_SECRET" \\
              -F "file=@$APK_PATH" \\
              -F "platform=android")
            echo "Appetize API Response: $RESPONSE"
            APPETIZE_PUB_KEY=$(echo "$RESPONSE" | jq -r '.publicKey // empty')
          else
            echo "No APPETIZE_TOKEN configured. Skipping interactive streaming upload."
          fi

          # 3. Commit status.json to builder-status branch
          mkdir -p /tmp/droidforge_status
          cat << STATUS_EOF > /tmp/droidforge_status/status.json
          {
            "state": "success",
            "errors": [],
            "appetizePublicKey": "$APPETIZE_PUB_KEY",
            "apkUrl": "$APK_DOWNLOAD_URL",
            "run": "\${{ github.run_id }}",
            "sha": "\${{ github.sha }}",
            "timestamp": $(date +%s%3N)
          }
          STATUS_EOF

          git config --global user.name "DroidForge Bot"
          git config --global user.email "bot@droidforge.local"
          git fetch origin builder-status:builder-status || true
          git checkout -B builder-status
          git rm -rf . --ignore-unmatch
          cp /tmp/droidforge_status/status.json status.json
          git add status.json
          git commit -m "build(ci): success status for run \${{ github.run_id }} [skip ci]" || true
          git push origin builder-status --force
          echo "Status committed to builder-status branch."
`;
}
