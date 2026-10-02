import React from 'react'

export type Role = 'admin' | 'external' | 'homes' | 'haavnonly'

export const EXTERNAL_PASSWORD = '7EvenConsult!!!'

// HAAVN HOMES builder login (Jeffrey Witbreuk + team). Locked to the HAAVN
// Homes / Black Series feasibility studio and the ATRIUM (HM) CRM only — no
// access to the 7EVEN feasibility studio or Capital Base.
export const HOMES_PASSWORD = 'HaavnHomes!!!'

// General HAAVN staff login (most of the team). Full access to HAAVN and
// HAAVN BLACK — the real estate studio, the Black Series homes company and
// the full ATRIUM Management Hub (Workflow + Meeting Management) — but never
// the 7EVEN feasibility studio or Capital Base, which holds 7EVEN's own
// Capital Administration book. Directors/managers use the full Atrium7x!!!
// code instead (role 'admin') for all three companies.
export const HAAVN_ONLY_PASSWORD = 'Atrium!!!'

const ROLE_KEY = '7even_role'

export function getStoredRole(): Role {
  return (localStorage.getItem(ROLE_KEY) as Role) ?? 'admin'
}

export function setStoredRole(role: Role) {
  localStorage.setItem(ROLE_KEY, role)
}

export function clearStoredRole() {
  localStorage.removeItem(ROLE_KEY)
}

export const RoleContext = React.createContext<Role>('admin')

export function useRole(): Role {
  return React.useContext(RoleContext)
}

// What external users can access. Financial-summary tabs (Land & Terms, Finance,
// BTR/BTS/Hotel valuations, Compare, Summary, Dashboard) stay hidden. Product Mix
// and Cashflow are shared with the consultant / project team.
export const EXTERNAL_TABS = ['site', 'mix', 'cost', 'cashflow', 'timeline']
