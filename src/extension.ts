import * as vscode from 'vscode';
import * as git from 'git-rev-sync';
import * as fs from 'fs';
import * as moment from 'moment';

import ConfigService from './Config';
import UpsourceService from './Upsource';
import ReviewsDataProvider from './ReviewsDataProvider';
import { FullUserInfoDTO } from './models/FullUserInfoDTO';
import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
import { ReviewIdDTO } from './models/ReviewIdDTO';
import { ReviewListDTO } from './models/ReviewListDTO';
import { ReviewStateEnum, RoleInReviewEnum } from './models/Enums';
import { ReviewTreeItem } from './models/ReviewTreeItem';
import { UpsConfig } from './models/UpsConfig';
import { ParticipantInReviewDTO } from './models/ParticipantInReviewDTO';

const { rootPath } = vscode.workspace;
const Upsource = new UpsourceService;
const Config = new ConfigService;

let _refreshInterval: any = null,
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
        { name: 'setup', callback: showSetupDialog },
        { name: 'showReviews', callback: showReviews },
        { name: 'createReview', callback: showCreateReviewQuickPicks },
        { name: 'closeReview', callback: showCloseReviewQuickPicks },
        { name: 'addParticipantToReview', callback: showParticipantsQuickPicks }
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
    Upsource.getUsers();

    let workspaceConfig = vscode.workspace.getConfiguration('upsource');
    if (workspaceConfig.get('checkForOpenReviewsOnLaunch')) checkForOpenReviews();
    if (workspaceConfig.get('refreshInterval') > 0) setRefreshInterval();
}

function showSetupDialog() {
    Config.setup();
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
                label: 'Current',
                description: 'Current branch',
                query: git.branch(rootPath)
            },
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
                    if (author) author = Upsource.findUser(author.userId);

                    let label = review.reviewId.reviewId;
                    if (review.isUnread) label = `* ${label}`;

                    let description = review.title,
                        date = moment(review.updatedAt).format('l LT'),
                        detail = ''; 
                        
                    if (review.state == ReviewStateEnum.Open) detail = '️📄 open';
                    else if (review.state == ReviewStateEnum.Closed) detail = '🔒 closed';
                    if (Upsource.hasRaisedConcerns(review)) detail = '️⚠️ concerns raised';
                    if (review.isReadyToClose) detail = '✅ ready to close';

                    if (author) detail += `, ${author.name}`;
                    detail += `, ${review.participants.length} participants`;
                    detail += `, ${review.discussionCounter.counter} discussion`;
                    if (review.discussionCounter.counter != 1) detail += 's';
                    if (date) detail += ` (${date})`;

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
                let author = Upsource.findUser(revision.authorId),
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

const createReview = async(branch = null, revisions = null) => {
    const review = await Upsource.createReview(branch, revisions);
    if (!review) return;
    vscode.window.showInformationMessage(
        "Review '" + review.reviewId.reviewId + "' successfully created."
    );

    let resetParticipants = <boolean>vscode.workspace.getConfiguration('upsource').get('resetParticipantsOnCreate');
    if (resetParticipants) {
        let participants = review.participants.filter((participant) => participant.role != RoleInReviewEnum.Author);
        participants.forEach((participant) => {
            Upsource.removeParticipantFromReview(review.reviewId, participant);
        });
    }

    const config:UpsConfig = await Config.get();
    const users = await Upsource.getUsersInfoForReview(review.reviewId);
    const validUsers = users.infos.filter( user =>
        config.reviewers.find(reviewer =>  reviewer.toLowerCase() === user.name.toLowerCase())
    );
    const all = await Promise.all(validUsers.map(user => {
            return <ParticipantInReviewDTO>{
                userId: user.userId,
                role: RoleInReviewEnum.Reviewer
            };
        }).map((participant) => Upsource.addParticipantToReview(review.reviewId, participant))
    );
    vscode.window.showInformationMessage(
        `Reviewers '${validUsers.map((user)=>user.name).join(', ')}' successfully added to review.`
    );
    _reviewDataProvider.refresh();
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

const showParticipantsQuickPicks = async() => {
    const res = await Upsource.getReviewList(git.branch(rootPath));
    if (res.totalCount !== 1 ) {
        vscode.window.showErrorMessage("Please create a review for the current branch first");
        return;
    }
    const review = res.reviews[0];
    const users = await Upsource.getUsersInfoForReview(review.reviewId);
    /*
     * Construct the menu with possible reviewers.
     */
    const selectedItem = await vscode.window.showQuickPick(users.infos.map(user =>
        ({
            label: user.name,
            description: user.email,
            user: user
        }))
    );
    if(!selectedItem) {
        return;
    }

    await Upsource.addParticipantToReview(review.reviewId, <ParticipantInReviewDTO>{
        userId: selectedItem.user.userId,
        role: RoleInReviewEnum.Reviewer
    });
    vscode.window.showInformationMessage(`Participant '${selectedItem.user.name}' successfully added to review '${review.reviewId.reviewId}'.`);
}


function showError(err) {
    vscode.window.showErrorMessage(err);
}

export function deactivate() {
    clearInterval(_refreshInterval);
}
