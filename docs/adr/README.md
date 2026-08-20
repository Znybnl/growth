# Décisions d'architecture (ADR)

Un ADR conserve une décision technique ou produit difficile à inverser. Il n'est pas nécessaire pour une correction, un détail visuel ou une décision temporaire.

## Quand créer un ADR

- changement durable d'architecture, d'hébergement, d'authentification ou de modèle de données ;
- choix d'un fournisseur critique ou d'une stratégie de sécurité ;
- décision qui pourrait être remise en question plusieurs mois plus tard.

## Format

Créer `NNNN-titre-court.md` à partir de ce modèle :

```md
# NNNN — Titre de la décision

**Statut :** proposé | accepté | remplacé

## Contexte

## Décision

## Conséquences

## Alternatives écartées
```

Un ADR proposé devient accepté uniquement après validation explicite de Pierre-Henri BRUNELLE. Il n'est jamais supprimé : une décision remplacée référence l'ADR qui la remplace.

## ADR existants

- [0001 — Séparer le site marketing et le SaaS](0001-marketing-et-saas-sur-des-sous-domaines.md)
