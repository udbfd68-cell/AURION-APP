Cherche et applique les skills pertinentes pour : $ARGUMENTS

1. Lis `.agents/skills-index.json` pour trouver les skills par catégorie
2. Si le sujet correspond à une catégorie (frontend, backend, database, auth, devops, testing, payments, ai, security, messaging, scraping, media, analytics, automation, code-quality, git, mobile, web3, documents, search, marketing, debugging, planning), liste toutes les skills de cette catégorie
3. Si c'est un mot-clé spécifique, cherche dans les noms de skills : `grep -ri "$ARGUMENTS" .agents/skills-index.json`
4. Pour chaque skill trouvée pertinente, lis son SKILL.md : `cat .agents/skills/<skill-name>/SKILL.md`
5. Résume les instructions clés et applique-les au contexte du projet Aurion Studio

Rappel : 2,217 skills installées depuis 83 créateurs officiels (skills.sh).
Catégories : frontend(188), ai(254), devops(155), testing(143), database(136), backend(41), auth(71), security(75), analytics(74), code-quality(73), git(60), media(46), automation(45), search(38), messaging(34), documents(34), mobile(33), planning(31), debugging(25), web3(7), payments(8), marketing(9)
