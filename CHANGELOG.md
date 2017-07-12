# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.3.1] 2017-07-12
### Fixed
- show review list when no author found

## [1.3.0] 2017-07-11
### Added
- unified reviews list
- custom queries
- autofill of default config values for faster setup
- show author name in review list
- new setting: `upsource.customQueries`
- new setting: `upsource.defaultConfig`
### Removed
- all reviews / open reviews in favor of unified list
### Fixed
- abort the setup process completely when cancelling input
- prevent error if project is not a git repo

## [1.2.0] 2017-07-11
### Added
- browse all branches on review creation
- close reviews functionality
- new setting: `upsource.checkForOpenReviewsOnLaunch`
- guided setup process

## [1.1.0] 2017-06-28
- feature: add filter quickpicks for open reviews

## [1.0.0] 2017-06-09
- initial release