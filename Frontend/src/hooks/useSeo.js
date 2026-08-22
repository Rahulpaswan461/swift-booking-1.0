import { useEffect } from 'react'

/**
 * Sets the document title and meta description for a route.
 *
 * This app is a single-page build with one index.html, so every route would
 * otherwise share the same title and description — which reads to a crawler
 * as four near-duplicate pages and makes per-page data in Search Console
 * useless. Googlebot renders JS, so it picks these up on the rendered page.
 *
 * Only platform (non-tenant) pages should call this. Clinic pages get their
 * title from ClinicContext, which knows the clinic's name.
 */
export default function useSeo({ title, description }) {
  useEffect(() => {
    if (title) document.title = title

    if (description) {
      let tag = document.head.querySelector('meta[name="description"]')
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', 'description')
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', description)
    }
  }, [title, description])
}
