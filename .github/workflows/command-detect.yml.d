name: Command Detection (RSS)

on:
  workflow_dispatch:
  schedule:
    - cron: "*/5 * * * *" # 5分ごとにRSSチェック

jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - name: Monitor RSS for start-mikanchat
        run: |
          set -e
          echo "Monitoring RSS for 5 minutes..."
          for i in {1..30}; do
            latest_title=$(curl -s https://www1.x-feeder.info/lo18bx2n/rss.php \
              | xmllint --xpath "string(//item[1]/title)" - 2>/dev/null || true)
            
            if [ -z "$latest_title" ]; then
              sleep 10
              continue
            fi

            # 「文」部分だけ抽出
            trigger=$(echo "$latest_title" | grep -oP '「\K.*?(?=」)')
            
            if [ -z "$trigger" ]; then
              sleep 10
              continue
            fi

            if [ "$trigger" = "start-mikanchat" ]; then
              echo "Trigger detected! Calling Deploy Workflow via API..."

              curl -X POST \
                -H "Accept: application/vnd.github+json" \
                -H "Authorization: Bearer $GITHUB_TOKEN" \
                https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/deploy.yml/dispatches \
                -d '{"ref":"main"}'

              break
            fi

            sleep 10
          done
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
