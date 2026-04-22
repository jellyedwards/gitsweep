# Change Log

## 1.0.2 (preview)

### Security / Chore

- Bump `mocha` 9 → 11 (clears serialize-javascript / nanoid /
  minimatch / js-yaml / diff advisories pulled in by the old mocha
  chain)
- Bump `typescript` 3.8 → 5.7 and `@types/node` 10 → 22 (also
  `@types/mocha` 5 → 10, `@types/vscode` → 1.63 to match `engines`)
- Remove the deprecated `tslint` dev dependency and its unused
  `tslint.json` config

### Fix

- Widen the locally-inferred `type` variable in `refresh()` so TS 5's
  stricter literal narrowing doesn't reject the `concat` of assumed-
  unchanged and excluded entries
- Drop the removed `mocha.useColors` call from the test runner and
  pass `color: true` to the `Mocha` constructor instead

## 1.0.1 (preview)

### Fix

- Handle workspaces that are not git repositories instead of crashing with
  an `ENOENT` on `.git/info/exclude` (#22)
- Display filenames with non-ASCII characters correctly in the panel by
  passing `-c core.quotepath=false` to `git ls-files` (#20)

### Security

- Stop passing filenames through the shell in `git ls-files` /
  `git update-index` calls, preventing command injection from filenames
  containing shell metacharacters
- `npm audit fix` bumps vulnerable transitive dependencies

## 0.0.15

Added tree/list view toggle

## 0.0.13

Upgrade vscode dependency for prerelease
## 0.0.12

### Fix

Absolute/relative path fixes

## 0.0.11

Allow excluding/including files with a right click on the explorer menu
Allow assume unchanged

## 0.0.10

Allow excluding/including folders with a right click on the explorer menu

## 0.0.9

### Fix

Handle exclude file patterns
Upgrade vsce and mocha due to vulnerabilities

## 0.0.8

### Fix

spawnSync /bin/sh ENOBUFS issue
handle files with regex characters e.g. brackets

## 0.0.7

### Security

Upgrade vsce due to underscore vulnerability

## 0.0.6

### Security

Bump lodash from 4.17.15 to 4.17.19

## 0.0.5

### Added

multiselect support

## 0.0.4

### Fix

need to do a case insensitive replace when shortening paths otherwise the
path in the exclude file won't be relative (and exclude won't work)

## 0.0.2 & 0.0.3

### Security

Updated minimist package.

## 0.0.1

Initial release of GitSweep.
