/*
 * TODO:
 *
 * - select revision via [UPS] getRevisionsList / [UPS] findCommits
 * - search for revision via [UPS] getRevisionsListFiltered
 * - add revision to review via [UPS] addRevisionToReview
 * - browse all projects
 * - delete / rename review ([UPS] renameReview)
 * - close all
 * - show project infos ([UPS] getProjectInfo)
 */

import * as vscode from 'vscode';
import * as git from 'git-rev-sync';
import * as fs from 'fs';
import * as moment from 'moment';

import Config from './Config';
import Upsource from './Upsource';
import ReviewsDataProvider from './ReviewsDataProvider';
import { FullUserInfoDTO } from './models/FullUserInfoDTO';
import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
import { ReviewIdDTO } from './models/ReviewIdDTO';
import { ReviewListDTO } from './models/ReviewListDTO';
import { ReviewStateEnum, RoleInReviewEnum } from './models/Enums';
import { ReviewTreeItem } from './models/ReviewTreeItem';
import { UpsConfig } from './models/UpsConfig';

const rootPath = vscode.workspace.rootPath;

let _users: FullUserInfoDTO[] = [],
    _refreshInterval: any = null,
    _reviewDataProvider = new ReviewsDataProvider();

export function activate(context: vscode.ExtensionContext) {
    /*
     * CUSTOM TREE VIEW
     */
    vscode.window.registerTreeDataProvider('upsourceView', _reviewDataProvider);

    /*
     * COMMANDS
     */
    let commands = [
        { name: 'setup', callback: Config.setup },
        { name: 'showReviews', callback: showReviews },
        { name: 'createReview', callback: showCreateReviewQuickPicks },
        { name: 'closeReview', callback: showCloseReviewQuickPicks }
    ];

    commands.forEach(command => {
        let subscription = vscode.commands.registerCommand(`upsource.${command.name}`, () =>
            command.callback()
        );
        context.subscriptions.push(subscription);
    });

    let open = vscode.commands.registerCommand('upsource.openReviewInBrowser', review => {
        openReviewInBrowser(review);
    });
    context.subscriptions.push(open);
    
    let refresh = vscode.commands.registerCommand('upsource.refreshDataProvider', () => {
        _reviewDataProvider.refresh();
    });
    context.subscriptions.push(refresh);
    
    let close = vscode.commands.registerCommand('upsource.closeReviewAndRefresh', (item: ReviewTreeItem) => {
        Upsource.closeReview(item.review.reviewId).then(() => _reviewDataProvider.refresh());
    });
    context.subscriptions.push(close);    

    /*
     * ON INIT
     */
    getUsers();

    let workspaceConfig = vscode.workspace.getConfiguration('upsource');
    if (workspaceConfig.get('checkForOpenReviewsOnLaunch')) checkForOpenReviews();
    if (workspaceConfig.get('refreshInterval') > 0) setRefreshInterval();
}

function getUsers() {
    Upsource.getUsers().then(users => {
        _users = users;
    });
}

function checkForOpenReviews(): void {
    Upsource.getReviewList('state: open').then(res => {
        if (res.totalCount) {
            vscode.window.showInformationMessage(
                'There are open Upsource reviews for this project.'
            );
        }
    });
}

function setRefreshInterval(): void {
    let minutes = <number>vscode.workspace.getConfiguration('upsource').get('refreshInterval'),
        millis = minutes * 60 * 1000;

    _refreshInterval = setInterval(() => {
        _reviewDataProvider.refresh();
    }, millis);
}

function showReviews(): void {
    let customQueries = <any[]>vscode.workspace.getConfiguration().get('upsource.customQueries'),
        items: any[] = [
            {
                label: 'All',
                description: 'All open & closed reviews',
                query: ''
            },
            {
                label: 'Open',
                description: 'Open reviews',
                query: 'state: open'
            },
            {
                label: 'Open: Created',
                description: 'Open reviews where you participate as an author',
                query: 'state: open and author: me'
            },
            {
                label: 'Open: Assigned',
                description: 'Pending open reviews where you participate as a reviewer',
                query: 'state: open and reviewer: me and not completed(by: me)'
            },
            {
                label: 'Open: Has concern',
                description:
                    'Open reviews where you participate as an author, containing rejected changes',
                query: 'state: open and author: me and completed(with: {has concern})'
            },
            {
                label: 'Open: Mentioned',
                description: 'Open reviews where you participate in any role',
                query: 'state: open and #my'
            },
            {
                label: 'Open: Completed',
                description: 'Reviews that can be closed',
                query: '#{ready to close} and author: me'
            }
        ];

    items = items.concat(customQueries);

    vscode.window.showQuickPick(items).then(selectedItem => {
        if (!selectedItem) return;
        showReviewQuickPicks(selectedItem.query);
    });
}

function showReviewQuickPicks(query?: string, callback?: Function): void {
    Upsource.getReviewList(query).then(
        res => {
            let totalCount = res.totalCount,
                reviews = res.reviews;

            if (!totalCount) vscode.window.showInformationMessage('No reviews');
            else {
                let items = reviews.map(review => {
                    let author: any = review.participants.find(
                        participant => participant.role == RoleInReviewEnum.Author
                    );
                    if (author) author = _users.find(user => user.userId == author.userId) || null;

                    let label = review.reviewId.reviewId;
                    if (review.isUnread) label = `* ${label}`;

                    let description = review.title;

                    let detail = review.state == ReviewStateEnum.Open ? '️📄 open' : '🔒 closed';
                    if (Upsource.hasRaisedConcerns(review)) detail = '️⚠️ concerns raised';
                    if (review.isReadyToClose) detail = '✅ ready to close';
                    if (author) detail += ', ' + author.name;
                    detail += ', ' + review.participants.length + ' participants';
                    detail += ', ' + review.discussionCounter.counter + ' discussions';

                    return { label, description, detail, review };
                });

                vscode.window.showQuickPick(items).then(selectedItem => {
                    if (!selectedItem) return;

                    let review = selectedItem.review;

                    if (callback) callback(review);
                    else openReviewInBrowser(review);
                });
            }
        },
        err => showError(err)
    );
}

function openReviewInBrowser(review: ReviewDescriptorDTO) {
    Config.get().then((config: UpsConfig) => {
        let url = config.url + '/' + config.projectId + '/review/' + review.reviewId.reviewId;

        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    });
}

function showCreateReviewQuickPicks(): void {
    let isGit = fs.existsSync(rootPath + '/.git'),
        items = [
            {
                label: 'For specific branch',
                description: 'Show branch list',
                branch: null,
                revisions: null,
                action: 'getBranches'
            },
            {
                label: 'For specific commit',
                description: 'Show revisions list',
                branch: null,
                revisions: null,
                action: 'getRevisions'
            }
        ];

    if (isGit) {
        let gitItems = [
            {
                label: 'For current branch',
                description: git.branch(rootPath),
                branch: git.branch(rootPath),
                revisions: null,
                action: null
            },
            {
                label: 'For most recent commit',
                description: git.short(rootPath),
                branch: null,
                revisions: [git.long(rootPath)],
                action: null
            }
        ];

        items = gitItems.concat(items);
    }

    vscode.window.showQuickPick(items).then(selectedItem => {
        if (!selectedItem) return;

        let action = selectedItem.action;
        if (action) {
            switch (action) {
                case 'getBranches':
                    showBranchesQuickPicks();
                    break;
                case 'getRevisions':
                    showRevisionsQuickPicks();
                    break;
            }
            return;
        }

        createReview(selectedItem.branch, selectedItem.revisions);
    });
}

function showCloseReviewQuickPicks(): void {
    showReviewQuickPicks('#{ready to close} and author: me', closeReview);
}

function showBranchesQuickPicks(): void {
    Upsource.getBranches().then(res => {
        let items = res.branch.map(branch => {
            return {
                label: branch.name,
                description: branch.lastRevision.revisionCommitMessage,
                branch: branch.name
            };
        });

        vscode.window.showQuickPick(items).then(selectedItem => {
            if (!selectedItem) return;
            createReview(selectedItem.branch);
        });
    });
}

function showRevisionsQuickPicks(): void {
    Upsource.getRevisions().then(
        res => {
            let items = res.revision.map(revision => {
                let author = _users.find(user => user.userId == revision.authorId) || null,
                    date = moment(revision.revisionDate).format('l LT');

                let detail = '';
                if (author) detail += author.name + ', ';
                detail += date;

                return {
                    label: revision.revisionCommitMessage.split('\n')[0],
                    description: revision.shortRevisionId,
                    detail: author || date ? detail : null,
                    revisions: [revision.revisionId]
                };
            });

            vscode.window.showQuickPick(items).then(selectedItem => {
                if (!selectedItem) return;
                createReview(null, selectedItem.revisions);
            });
        },
        err => console.log(err)
    );
}

function createReview(branch = null, revisions = null): void {
    Upsource.createReview(branch, revisions).then(
        review => {
            if (!review) return;

            vscode.window.showInformationMessage(
                "Review '" + review.reviewId.reviewId + "' successfully created."
            );

            _reviewDataProvider.refresh();
        },
        err => showError(err)
    );
}

function closeReview(review: ReviewDescriptorDTO) {
    Upsource.closeReview(review.reviewId).then(
        () => {
            vscode.window.showInformationMessage(
                "Review '" + review.reviewId.reviewId + "' successfully closed."
            );
        },
        err => showError(err)
    );
}

function showError(err) {
    vscode.window.showErrorMessage(err);
}

export function deactivate() {
    clearInterval(_refreshInterval);
}
