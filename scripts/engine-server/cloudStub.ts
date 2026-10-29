// Stands in for src/db/cloud.ts in the server bundle: the server only reads, so every push is a no-op (and the Supabase client is not bundled).
const noop = (..._a: unknown[]) => {}
export const pushProject = noop
export const pushProjectField = noop
export const pushScenario = noop
export const pushScenarioField = noop
export const pushFeasibilityFiles = noop
export const deleteCloudScenario = noop
export const deleteFeasibilityFileCloud = noop
export const deleteCloudProject = noop
export const pushSnapshot = noop
export const deleteCloudSnapshot = noop
export const noteKeyWrite = noop
export const setSeeding = noop
export const suppressingRemote = () => false
