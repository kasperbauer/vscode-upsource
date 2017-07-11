/*
* TODO:
* - add
* - select revision via [UPS] getRevisionsList / [UPS] findCommits
* - get all git branches via [UPS] getBranches
* - search for revision via [UPS] getRevisionsListFiltered
* - add revision to review via [UPS] addRevisionToReview
* - browse all projects
* - close / delete / rename review
* - ask for credentials on setup
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
        showOpenReviewOptions();
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
    Upsource.getReviewList('state: open').then(
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

function showOpenReviewOptions(): void {
    let items: any[] = [
        {
            label: 'All',
            description: 'All open reviews',
            detail: '',
            query: 'state: open'
        },
        {
            label: 'Created',
            description: 'Open reviews where you participate as an author',
            detail: '',
            query: 'state: open and author: me'
        },
        {
            label: 'Assigned',
            description: 'Pending open reviews where you participate as a reviewer',
            detail: '',
            query: 'state: open and reviewer: me and not completed(by: me)'
        },
        {
            label: 'Has concern',
            description:
                'Open reviews where you participate as an author, containing rejected changes',
            detail: '',
            query: 'state: open and author: me and completed(with: {has concern})'
        },
        {
            label: 'Mentioned',
            description: 'state: open and #my',
            detail: '',
            query: 'state: open'
        },
        {
            label: 'Completed',
            description: '#{ready to close} and author: me',
            detail: '',
            query: 'state: open'
        }
    ];

    vscode.window.showQuickPick(items).then(selectedItem => {
        if (!selectedItem) return;
        showReviewQuickPicks(selectedItem.query);
    });
}

function showReviewQuickPicks(query?: string, callback?: Function): void {
    Upsource.getReviewList(query).then(res => {
        let totalCount = res.totalCount,
            reviews = res.reviews;

        if (!totalCount) vscode.window.showInformationMessage('No reviews');
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
