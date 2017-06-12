/*
* TODO:
* - open reviews: filter 'ready to close'
* - get last revision via getRevisionsList / findCommits
* - get git branches via getBranches
* - search for revision via getRevisionsListFiltered
* - filter reviews (my reviews,...)
* - add revision to review via addRevisionToReview
* - browse all projects
* - close review
*/

'use strict';

import * as vscode from 'vscode';
import * as opn from 'opn';
import * as git from 'git-rev-sync';

import Config from './Config';
import Upsource from './Upsource';
import { ReviewListDTO } from './models/ReviewListDTO';
import { UpsConfig } from './models/UpsConfig';

const rootPath = vscode.workspace.rootPath;

export function activate(context: vscode.ExtensionContext) {
    checkForOpenReviews();

    // create upsource.json config file with defaults
    let setup = vscode.commands.registerCommand('upsource.setup', () => {
        Config.setup();
    });

    // get open reviews and show a quick pick list
    let openReviews = vscode.commands.registerCommand('upsource.openReviews', () => {
        showReviewQuickPicks('open');
    });

    // get all reviews and show a quick pick list
    let allReviews = vscode.commands.registerCommand('upsource.allReviews', () => {
        showReviewQuickPicks();
    });

    // create review from current branch / revision
    let createReview = vscode.commands.registerCommand('upsource.createReview', () => {
        showCreateReviewQuickPicks();
    });

    context.subscriptions.push(setup);
    context.subscriptions.push(openReviews);
    context.subscriptions.push(allReviews);
    context.subscriptions.push(createReview);
}

function checkForOpenReviews(): void {
    Upsource.getReviewListWithState('open').then(
        res => {
            if (res.totalCount) {
                vscode.window.showInformationMessage(
                    'There are open Upsource reviews for this project.'
                );
            }
        },
        err => {
            console.log(err);
        }
    );
}

function showReviewQuickPicks(state?: string, callback?: Function): void {
    Upsource.getReviewListWithState(state).then(res => {
        let totalCount = res.totalCount,
            reviews = res.reviews;

        if (!totalCount) vscode.window.showInformationMessage('No ' + state + ' reviews.');
        else {
            let items = reviews.map(review => {
                let label = review.reviewId.reviewId;
                if (review.isUnread) label += ' *';

                let description = review.title;

                let detail = review.state == 1 ? '️⚠️ open' : '✅ closed';
                detail += ', ' + review.participants.length + ' participants';
                detail += ', ' + review.discussionCounter.counter + ' discussions';

                return { label, description, detail, review };
            });

            vscode.window.showQuickPick(items).then(selectedItem => {
                if (!selectedItem) return;

                if (callback) callback(selectedItem);
                else {
                    Config.get().then((config: UpsConfig) => {
                        let url =
                            config.url +
                            '/' +
                            config.projectId +
                            '/review/' +
                            selectedItem.review.reviewId.reviewId;

                        opn(url);
                    });
                }
            });
        }
    });
}

function showCreateReviewQuickPicks(): void {
    let items = [
        {
            label: 'For current branch',
            description: git.branch(rootPath),
            branch: git.branch(rootPath),
            revisions: null
        },
        {
            label: 'For most recent commit',
            description: git.short(rootPath),
            branch: null,
            revisions: [git.long(rootPath)]
        }
    ];

    vscode.window.showQuickPick(items).then(selectedItem => {
        if (!selectedItem) return;

        Upsource.createReview(selectedItem.branch, selectedItem.revisions).then(review => {
            if (!review) return;

            vscode.window.showInformationMessage(
                "Review '" + review.reviewId.reviewId + "' successfully created."
            );
        });
    });
}

export function deactivate() {}
