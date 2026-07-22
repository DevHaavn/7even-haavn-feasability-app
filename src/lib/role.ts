import React from 'react'

export type Role = 'admin' | 'external' | 'homes'

export const EXTERNAL_PASSWORD = '7EvenConsult!!!'

// HAAVN HOMES builder login (Jeffrey Witbreuk + team). Locked to the HAAVN
// Homes / Black Series feasibility studio and the ATRIUM (HM) CRM only — no
// access to the 7EVEN feasibility studio or Capital Base.
export const HOMES_PASSWORD = 'HaavnHomes!!!'

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
