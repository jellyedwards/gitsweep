# Change Log

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
