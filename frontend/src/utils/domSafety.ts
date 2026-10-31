/**
 * Utilitaires de sécurité DOM pour React 18/19.
 * 
 * 1. setupSafeDomNodePatch() :
 * Protège React contre le crash fatal "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 * causé par les extensions de navigateur (Google Translate, Grammarly, DeepL, gestionnaires de mots de passe,
 * bloqueurs de pub) ou les bibliothèques manipulant directement le DOM (Leaflet, Recharts, SVG).
 * 
 * 2. getPortalContainer() :
 * Fournit un conteneur dédié (#portal-root) pour tous les createPortal() afin d'éviter les collisions
 * avec document.body et les extensions tierces.
 */

export function setupSafeDomNodePatch(): void {
  if (typeof window === 'undefined' || typeof Node === 'undefined' || !Node.prototype) {
    return;
  }

  // Éviter de patcher deux fois
  if ((Node.prototype as any).__cnive_safe_dom_patched) {
    return;
  }
  (Node.prototype as any).__cnive_safe_dom_patched = true;

  const isDev = import.meta.env.DEV;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (!child) {
      return child;
    }

    // Si l'enfant n'est pas un enfant direct de ce parent (cas typique de Google Translate ou extensions)
    if (child.parentNode !== this) {
      if (isDev) {
        console.warn(
          "[CNIVE SafeDOM] Évité un crash removeChild : l'élément n'est pas un enfant direct de ce parent.",
          { parent: this, child, actualParent: child.parentNode }
        );
      }
      // Si l'enfant a un autre parent réel (ex: balise <font> injectée par Google Translate),
      // on le retire proprement de son vrai parent.
      if (child.parentNode) {
        return child.parentNode.removeChild(child);
      }
      // Si l'enfant n'a plus de parent (déjà retiré), on retourne simplement le nœud sans lever d'exception.
      return child;
    }

    try {
      return originalRemoveChild.call(this, child) as T;
    } catch (err) {
      if (isDev) {
        console.warn("[CNIVE SafeDOM] Exception interceptée dans removeChild:", err);
      }
      if (child.parentNode && child.parentNode !== this) {
        return child.parentNode.removeChild(child);
      }
      return child;
    }
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (!newNode) {
      return newNode;
    }

    // Si referenceNode est fourni mais n'appartient pas à ce parent
    if (referenceNode && referenceNode.parentNode !== this) {
      if (isDev) {
        console.warn(
          "[CNIVE SafeDOM] Évité un crash insertBefore : referenceNode n'est pas un enfant de ce parent.",
          { parent: this, referenceNode, actualParent: referenceNode.parentNode }
        );
      }
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode);
      }
      return this.appendChild(newNode);
    }

    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (err) {
      if (isDev) {
        console.warn("[CNIVE SafeDOM] Exception interceptée dans insertBefore:", err);
      }
      return this.appendChild(newNode);
    }
  };
}

/**
 * Retourne le conteneur DOM dédié aux modales et portails.
 * Crée le conteneur s'il n'existe pas encore.
 */
export function getPortalContainer(): HTMLElement {
  if (typeof document === 'undefined') {
    return {} as HTMLElement;
  }
  let portalRoot = document.getElementById('portal-root');
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'portal-root');
    portalRoot.setAttribute('translate', 'no');
    portalRoot.className = 'notranslate';
    document.body.appendChild(portalRoot);
  }
  return portalRoot;
}
