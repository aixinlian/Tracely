import { db, type Project } from "@/lib/db";

export type NewProject = {
  name: string;
  path: string;
  description?: string;
  branches?: string[];
};

/** Derive a readable default name from a folder path. */
export function nameFromPath(path: string): string {
  const parts = path.split(/[/\\]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export async function addProject(input: NewProject): Promise<number> {
  const now = Date.now();
  const name = input.name.trim() || nameFromPath(input.path);
  return db.projects.add({
    name,
    path: input.path,
    description: input.description?.trim() || undefined,
    branches: input.branches?.length ? input.branches : undefined,
    createdAt: now,
    updatedAt: now,
  } as Project);
}

export async function updateProject(
  id: number,
  changes: Partial<Pick<Project, "name" | "description" | "branches">>,
): Promise<void> {
  const patch: Partial<Project> = { updatedAt: Date.now() };
  if (changes.name !== undefined) patch.name = changes.name.trim();
  if (changes.description !== undefined)
    patch.description = changes.description.trim() || undefined;
  if (changes.branches !== undefined)
    patch.branches = changes.branches.length ? changes.branches : undefined;
  await db.projects.update(id, patch);
}

export async function removeProject(id: number): Promise<void> {
  await db.projects.delete(id);
}

/** Remove multiple projects by IDs in a single transaction. */
export async function removeProjects(ids: number[]): Promise<void> {
  await db.projects.bulkDelete(ids);
}

/** Add multiple projects in a single transaction. Returns created IDs. */
export async function addProjects(inputs: NewProject[]): Promise<number[]> {
  const now = Date.now();
  const records = inputs.map((input) => ({
    name: input.name.trim() || nameFromPath(input.path),
    path: input.path,
    description: input.description?.trim() || undefined,
    branches: input.branches?.length ? input.branches : undefined,
    createdAt: now,
    updatedAt: now,
  })) as Project[];
  // bulkAdd returns the key of the last inserted record, not an array.
  // For batch inserts where we need all IDs, we insert one-by-one in a transaction.
  return db.transaction("rw", db.projects, async () => {
    const ids: number[] = [];
    for (const rec of records) {
      const id = await db.projects.add(rec);
      ids.push(id);
    }
    return ids;
  });
}

export async function projectExists(path: string): Promise<boolean> {
  const count = await db.projects.where("path").equals(path).count();
  return count > 0;
}
