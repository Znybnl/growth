<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Publication Git

Ce dépôt se publie directement avec Git via SSH. GitHub CLI (`gh`) n'est pas requis.

- Remote : `ssh://git@ssh.github.com:443/Znybnl/growth.git`
- Clé SSH : `C:\Users\PBRUNELLE\.ssh\key_git`
- Pour les commandes réseau Git, utiliser :
  `git -c core.sshCommand="ssh -i 'C:\\Users\\PBRUNELLE\\.ssh\\key_git' -o IdentitiesOnly=yes" <commande>`

Avant un push vers `main`, toujours récupérer et intégrer l'état distant (`fetch origin main`, puis rebase sur `origin/main` si nécessaire), vérifier lint/build, puis pousser. Ne jamais bloquer une publication parce que `gh` est absent.
