[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location "c:\Users\dylanynsu\WorkBuddy\20260420112622\ip-database"

git config user.email "rfssuyingnan@gmail.com"
git config user.name "dylan-byte-max"
git add .
git commit -m "feat: IP Database v1.0 - Vue3 + Supabase + Tailwind + ECharts"
git branch -M main
git push -u origin main
