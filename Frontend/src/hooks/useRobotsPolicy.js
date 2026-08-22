import { useEffect } from 'react'
import { isPlatformHost } from '../utils/host'

/**
 * Keeps clinic subdomains out of search results.
 *
 * Every clinic page is the same template with a different name on it. Left
 * indexable, they read to a crawler as many near-duplicate pages under one
 * domain, which drags down the platform site's own standing. Clinics are
 * reached through the link they share, not through search.
 *
 * Runs once per page load — the host cannot change without a reload.
 *
 * To start indexing clinic pages later, delete this hook's call in App.jsx.
 */
export default function useRobotsPolicy() {
  useEffect(() => {
    // The platform site must stay indexable. Never add the tag here, and
    // clear a stale one if it somehow exists.
    if (isPlatformHost()) {
      document.head.querySelector('meta[name="robots"]')?.remove()
      return
    }

    let tag = document.head.querySelector('meta[name="robots"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'robots')
      document.head.appendChild(tag)
    }
    // noindex keeps the page out of results; follow still lets link equity
    // flow back to the platform site.
    tag.setAttribute('content', 'noindex, follow')
  }, [])
}
