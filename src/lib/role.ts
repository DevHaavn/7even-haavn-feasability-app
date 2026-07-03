import React from 'react'

export type Role = 'admin' | 'external'

export const EXTERNAL_PASSWORD = '7EvenConsult!!!'

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

// What external users can access
export const EXTERNAL_TABS = ['site', 'mix', 'cost', 'timeline']
