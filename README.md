# llms-txt-generator

Génère un fichier `llms.txt` à partir du sitemap de votre site. Un seul fichier, aucune dépendance, Node 18 ou plus.

*Generate an `llms.txt` file from any sitemap. Single file, zero dependencies.*

## À quoi sert un llms.txt ?

`llms.txt` est un fichier texte placé à la racine d'un site, qui présente aux assistants IA (ChatGPT, Claude, Perplexity, Gemini) les pages importantes avec un titre et une phrase de description. C'est l'équivalent d'un plan du site écrit pour une machine qui lit du Markdown. Le format est décrit sur [llmstxt.org](https://llmstxt.org/).

Ce fichier ne remplace ni le sitemap ni le `robots.txt`, et aucun moteur ne promet de l'utiliser. Il coûte cinq minutes et rend votre site plus simple à lire pour un agent : c'est une bonne raison suffisante.

## Utilisation

Sans installation :

```bash
npx github:YanisZedira/llms-txt-generator https://votre-site.fr/sitemap.xml
```

Le fichier `llms.txt` est écrit dans le dossier courant. Déposez-le à la racine de votre site : `https://votre-site.fr/llms.txt`.

### Options

| Option | Rôle | Défaut |
|---|---|---|
| `--out <fichier>` | Fichier de sortie, `-` pour la sortie standard | `llms.txt` |
| `--limit <n>` | Nombre maximum de pages lues | `200` |
| `--concurrency <n>` | Pages lues en parallèle | `4` |
| `--title <texte>` | Titre du site | titre de la page d'accueil |
| `--summary <texte>` | Résumé du site | description de la page d'accueil |
| `--exclude <regex>` | Ignore les URL qui correspondent | aucun |

Exemple, en écartant les pages de mentions légales et en limitant à 100 pages :

```bash
npx github:YanisZedira/llms-txt-generator https://votre-site.fr/sitemap.xml --limit 100 --exclude "legal|cgv|panier"
```

## Ce que fait le script

1. Il lit le sitemap, y compris un index de sitemaps.
2. Il visite chaque page et relève la balise `<title>` et la description.
3. Il écarte les pages marquées `noindex` et celles qui ne répondent pas.
4. Il regroupe les pages par premier dossier de l'URL (`/blog/...`, `/services/...`).
5. Il écrit le fichier au format llmstxt.org.

Exemple de sortie :

```markdown
# Nom du site

> Résumé du site en une phrase.

## Pages principales

- [Titre de la page](https://votre-site.fr/page): Description de la page.

## Blog

- [Titre de l'article](https://votre-site.fr/blog/article): Description de l'article.
```

## Limites à connaître

- Le script lit le HTML renvoyé par le serveur. Si votre site n'affiche son titre qu'après exécution du JavaScript, les pages sortiront vides : il faut un pré-rendu.
- La qualité du fichier dépend de vos balises. Un titre vague donne une ligne vague. Corrigez d'abord les titres et les descriptions.
- Relisez le résultat. Retirez les pages sans intérêt, remontez les plus importantes.

## Pour aller plus loin

- [Être cité par ChatGPT, Perplexity et Gemini](https://yz-automation.fr/ressources/blog/geo-etre-cite-par-chatgpt-perplexity-gemini-2026) : ce qui fait qu'une page est reprise dans une réponse d'IA.
- [Checklist SEO local](https://github.com/YanisZedira/checklist-seo-local) : 40 points à vérifier pour une entreprise locale.
- [Calculateur du temps perdu](https://github.com/YanisZedira/calculateur-temps-perdu) : chiffrer ce que coûtent les tâches répétitives.

## Auteur

Écrit par Yanis Zedira, fondateur de [YZ Automation](https://yz-automation.fr), qui conçoit des sites, des agents IA et des automatisations pour les PME. Le script vient de la chaîne de publication du site, où il produit [ce fichier](https://yz-automation.fr/llms.txt).

Licence MIT. Les corrections et les idées sont bienvenues dans les tickets.
