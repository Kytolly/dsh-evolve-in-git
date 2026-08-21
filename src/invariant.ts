/**
 * Package-owned invariant companion for `dsh-evolve-in-git`.
 * @module dsh-evolve-in-git/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-evolve-in-git'

/** Cordis companion plugin name. */
export const name = 'evolve-git-invariant'

/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this package externalizes its source of truth into a
 * user-chosen Git repository, so the stable assertion is the configured repo
 * path existing and remaining Git-readable.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
